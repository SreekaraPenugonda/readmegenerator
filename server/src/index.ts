import 'dotenv/config';
import express, { Request, Response } from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import { Readme } from './models/readme';
import cors from 'cors';

const app = express();
const PORT = 5000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const MONGO_URI = process.env.MONGO_URI || "";

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

app.use(express.json());
app.use(cors());

app.get('/', (req: Request, res: Response) => {
  res.json({ message: "The Node.js TypeScript server is up and running!" });
});

// UPGRADED ROBUST CONNECTION HOOK WITH AUTO-RETRY LOGIC
const connectWithRetry = () => {
  console.log('🔄 Attempting secure connection to MongoDB Cloud...');
  
  mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of locking up
    socketTimeoutMS: 45000,         // Close inactive sockets after 45 seconds
  })
  .then(() => {
    console.log("💾 Connected successfully to MongoDB Cloud!");
  })
  .catch((err) => {
    console.error("❌ Database handshake throttled by cloud node. Retrying in 5 seconds...");
    // If the free-tier node throws a SystemOverloaded error, wait 5 seconds and retry automatically
    setTimeout(connectWithRetry, 5000);
  });
};

// Initialise the connection loop
connectWithRetry();

app.get('/generate-readme', async (req: Request, res: Response) => {
  try {
    // 1. Grab the repository link sent from our frontend input form
    const repoUrl = req.query.repoUrl as string;

    if (!repoUrl) {
       res.status(400).json({ status: "error", error: "Missing required parameter: repoUrl" });
       return;
    }

    // 2. Call our updated Python scraper service and pass along the URL safely
    const pythonResponse = await axios.get(`http://localhost:8000/scan-github`, {
      params: { repo_url: repoUrl }
    });

    // If the Python scraper hit an error with the link, catch it here
    if (pythonResponse.data.status === 'error') {
       res.status(422).json({ status: "error", error: pythonResponse.data.message });
       return;
    }

    const fileList = pythonResponse.data.files;
    const targetRepository = pythonResponse.data.repository;

    // 3. Construct a specific prompt using the remote repository file list
    const developerPrompt = `
      You are an expert technical writer. Look at this list of files from the remote GitHub repository "${targetRepository}":
      ${JSON.stringify(fileList)}
      
      Write an exceptional, beautifully formatted README.md file in markdown text. 
      Include an overview, clean file structure panel, stack specifications, and step-by-step setup guides. Keep it clear and high-value.
    `;

    // 4. Fire the prompt to the Gemini API
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: developerPrompt,
    });

    const markdownText = aiResponse.text;

    // 5. Commit the output directly into your MongoDB Atlas cloud tracker
    const savedReadme = new Readme({
      projectPath: targetRepository,
      markdownContent: markdownText
    });
    await savedReadme.save();

    // 6. Return the data back to your React application screen
    res.json({
      status: "success",
      message: "README generated and saved to MongoDB!",
      data: savedReadme
    });

  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to process remote repository documentation.",
      details: error.message 
    });
  }
});

// 1. GET ALL HISTORICAL RECORDS FROM MONGO
app.get('/api/history', async (req: Request, res: Response) => {
  try {
    const records = await Readme.find().sort({ createdAt: -1 });
    res.json({ status: "success", data: records });
  } catch (error: any) {
    res.status(500).json({ status: "error", error: error.message });
  }
});

// 2. DELETE A SPECIFIC RECORD FROM MONGO
app.delete('/api/history/:id', async (req: Request, res: Response) => {
  try {
    await Readme.findByIdAndDelete(req.params.id);
    res.json({ status: "success", message: "Record cleanly dropped from cluster." });
  } catch (error: any) {
    res.status(500).json({ status: "error", error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Server is listening at http://localhost:${PORT}`);
});
