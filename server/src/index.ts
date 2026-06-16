import 'dotenv/config'; // Automatically loads your hidden .env keys
import express, { Request, Response } from 'express';
import axios from 'axios';
import mongoose from 'mongoose'; // 1. Import Mongoose
import { GoogleGenAI } from '@google/genai';
import { Readme } from './models/readme'; // 2. Import our blueprint
import cors from 'cors'; // Import the security bypass engine


const app = express();
const PORT = 5000;

// No more secret values in plain sight!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const MONGO_URI = process.env.MONGO_URI || "";

 // 3. Paste your Atlas string here!

// Connect to MongoDB Database
mongoose.connect(MONGO_URI)
  .then(() => console.log("💾 Connected successfully to MongoDB Cloud!"))
  .catch((err) => console.error("❌ Database connection error:", err));

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

app.use(express.json());
app.use(cors()); // Allow requests from our React frontend!


app.get('/', (req: Request, res: Response) => {
  res.json({ message: "The Node.js TypeScript server is up and running!" });
});

// Updated Core Route: Generate and Save to DB!
// Replace your old /generate-readme route with this complete block:
app.get('/generate-readme', async (req: Request, res: Response) => {
  try {
    // 1. Fetch the clean folder structure from your Python scanner
    const pythonResponse = await axios.get('http://localhost:8000/scan');
    const fileList = pythonResponse.data.files;
    
    // FIX: Safely fallback to our project name if Python's path string is empty
    const scannedFolder = pythonResponse.data.folder_scanned || "ai-readme-builder";

    const developerPrompt = `
      You are an expert technical writer. Look at this list of files:
      ${JSON.stringify(fileList)}
      Write a highly professional README.md file in markdown text. Keep it clean and readable.
    `;

    // 2. Call the AI model
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: developerPrompt,
    });

    const markdownText = aiResponse.text;

    // 3. Save the result to our cloud database
    const savedReadme = new Readme({
      projectPath: scannedFolder, // This will now always have a value!
      markdownContent: markdownText
    });
    await savedReadme.save();

    // 4. Return success payload
    res.json({
      status: "success",
      message: "README generated and saved to MongoDB!",
      data: savedReadme
    });

  } catch (error: any) {
    res.status(500).json({ 
      error: "Failed to generate or save README.",
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is listening at http://localhost:${PORT}`);
});
