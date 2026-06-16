import 'dotenv/config';
import express, { Request, Response } from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { GoogleGenAI } from '@google/genai';
import { Readme } from './models/readme';
import { User, IUser } from './models/user';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
const PORT = process.env.PORT || 5000;

/* ---- Startup Check ---- */
// Ensure we always have a Gemini Key and Mongo URI to connect out
if (!process.env.GEMINI_API_KEY || !process.env.MONGO_URI) {
  console.error("❌ MISSING CORE INFRASTRUCTURE ENV VARIABLES: GEMINI_API_KEY or MONGO_URI");
  process.exit(1);
}

// Assign safe default fallbacks if optional notification configurations are blank
const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const MONGO_URI = process.env.MONGO_URI as string;
const JWT_SECRET = process.env.JWT_SECRET || 'docuengine_fallback_secure_jwt_token_secret_node';

process.env.EMAIL_USER = process.env.EMAIL_USER || 'placeholder@gmail.com';
process.env.EMAIL_PASS = process.env.EMAIL_PASS || 'placeholder_password';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/* ---- Email Transporter ---- */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.use(express.json({ limit: '5mb' }));
app.use(cors());

/* ---- Request Logger for Debugging ---- */
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`);
  next();
});

/* ---- Auth Middleware ---- */
interface AuthRequest extends Request {
  userId?: string;
  user?: IUser;
}

// Validation Schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(2).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const otpVerifySchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).required()
});

const authMiddleware = async (req: AuthRequest, res: Response, next: () => void) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', error: 'Authentication required' });
    }
    const token = header.split(' ')[1];
    if (token === 'guest') {
      req.userId = 'guest';
      // Use a safe partial for Guest
      req.user = { name: 'Guest', email: 'guest@local', _id: 'guest' } as any;
      next();
      return;
    }
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ status: 'error', error: 'User session expired' });
    }
    req.userId = user._id.toString();
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ status: 'error', error: 'Session invalid' });
  }
};

/* ---- MongoDB Connection ---- */
const connectWithRetry = () => {
  console.log('🔄 Connecting to MongoDB...');
  mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 })
    .then(() => console.log('💾 MongoDB connected'))
    .catch((err) => { console.error(`❌ MongoDB connection error: ${err.message}. Retrying in 5s...`); setTimeout(connectWithRetry, 5000); });
};
connectWithRetry();

/* ===================================================================
   AUTH ROUTES
   =================================================================== */

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      res.status(400).json({ error: 'Email, password, and name required' });
      return;
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ email: email.toLowerCase(), password: hashed, name });
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      status: 'success',
      token,
      user: { id: user._id, email: user.email, name: user.name, githubUsername: user.githubUsername }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ status: 'error', error: error.details[0].message });

    const { email, password } = value;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ status: 'error', error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ status: 'error', error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      status: 'success',
      token,
      user: { id: user._id, email: user.email, name: user.name, githubUsername: user.githubUsername }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: 'Login failed' });
  }
});

// OTP - Send
app.post('/api/auth/otp-send', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 
    if (!email || !emailRegex.test(email)) return res.status(400).json({ error: 'Valid email required' });
    
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      const dummyPass = await bcrypt.hash(Math.random().toString(36), 12);
      user = await User.create({ email: email.toLowerCase(), password: dummyPass, name: email.split('@')[0] });
    }

    if (user.otpExpires) {
      const timeLeft = user.otpExpires.getTime() - Date.now();
      if (timeLeft > (9 * 60 * 1000)) {
        return res.status(429).json({ status: 'error', error: 'Please wait 60s before requesting another code' });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60000); // 10 mins expiry
    await user.save();

    // Send OTP via Email
    const mailOptions = {
      from: `"DocuEngine Pro" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Verification Code - DocuEngine Pro',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1e293b; text-align: center;">Your Verification Code</h2>
          <p style="color: #475569; font-size: 16px;">Hello,</p>
          <p style="color: #475569; font-size: 16px;">Use the following OTP to complete your sign-in to DocuEngine Pro. This code is valid for 10 minutes.</p>
          <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #3b82f6; letter-spacing: 4px;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 14px; text-align: center;">If you did not request this code, please ignore this email.</p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (e) { console.error("Email fail:", e); }

    console.log(`[OTP] Sent code ${otp} to ${email}`);
    res.json({ status: 'success', message: 'OTP sent successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
// OTP - Verify Complete Endpoint Handler
app.post('/api/auth/otp-verify', async (req: Request, res: Response) => {
  try {
    const { error, value } = otpVerifySchema.validate(req.body);
    if (error) return res.status(400).json({ status: 'error', error: error.details[0].message });

    const { email, otp } = value;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || user.otp !== otp) {
      return res.status(401).json({ status: 'error', error: 'Invalid verification code' });
    }

    if (user.otpExpires && user.otpExpires.getTime() < Date.now()) {
      return res.status(401).json({ status: 'error', error: 'Verification code expired' });
    }

    // Clear OTP fields post-verification success
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      status: 'success',
      token,
      user: { id: user._id, email: user.email, name: user.name, githubUsername: user.githubUsername }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', error: 'OTP validation failed' });
  }
});

/* ===================================================================
   WORKSPACE ANALYSIS ROUTING INFRASTRUCTURE
   =================================================================== */

app.get('/generate-readme', async (req: Request, res: Response) => {
  try {
    const repoUrl = req.query.repoUrl as string;
    if (!repoUrl) return res.status(400).json({ status: "error", error: "Missing required parameter: repoUrl" });

    const pythonResponse = await axios.get(`http://localhost:8000/scan-github`, { params: { repo_url: repoUrl } });
    if (pythonResponse.data.status === 'error') return res.status(422).json({ status: "error", error: pythonResponse.data.message });

    const fileList = pythonResponse.data.files;
    const targetRepository = pythonResponse.data.repository;

    const developerPrompt = `
      You are an expert technical writer. Look at this list of files from the remote GitHub repository "${targetRepository}":
      ${JSON.stringify(fileList)}
      Write an exceptional, beautifully formatted README.md file in markdown text. Keep it clean and high-value.
    `;

    const aiResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: developerPrompt });
    const markdownText = aiResponse.text;

    const savedReadme = new Readme({ projectPath: targetRepository, markdownContent: markdownText });
    await savedReadme.save();

    res.json({ status: "success", message: "README generated and saved to MongoDB!", data: savedReadme });
  } catch (error: any) {
    res.status(500).json({ status: "error", error: "Failed to process repository documentation.", details: error.message });
  }
});

// History Logs Reader Endpoint for Dashboard Tracker
app.get('/api/history', async (req: Request, res: Response) => {
  try {
    const records = await Readme.find().sort({ createdAt: -1 });
    res.json({ status: "success", data: records });
  } catch (error: any) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

// Drop Records Pipeline Handler
app.delete('/api/history/:id', async (req: Request, res: Response) => {
  try {
    await Readme.findByIdAndDelete(req.params.id);
    res.json({ status: "success", message: "Record cleanly dropped from cluster." });
  } catch (error: any) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

/* ---- System Port Initialization ---- */
app.listen(PORT, () => {
  console.log(`🚀 Server is listening at http://localhost:${PORT}`);
});