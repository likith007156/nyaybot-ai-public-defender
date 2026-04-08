import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all origins (completely open for the frontend)
app.use(cors());
app.use(express.json());


// Load data files for the contextual brain
const systemPrompt = fs.readFileSync(path.join(__dirname, 'legal_bot.txt'), 'utf8');
const legalKnowledge = JSON.parse(fs.readFileSync(path.join(__dirname, 'legal_knowledge.json'), 'utf8'));
const lawExplanations = JSON.parse(fs.readFileSync(path.join(__dirname, 'law_explanations.json'), 'utf8'));
const casesDataset = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases_dataset.json'), 'utf8'));

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history, language } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required." });
        }

        // We construct the contextual background
        let context = `
${systemPrompt}

--- CONFIGURATION ---
User Preferred Language: ${language || 'English'}. You MUST reply primarily in this language, while keeping legal Acts and Section numbers in English if appropriate.
---------------------

--- AVAILABLE KNOWLEDGE BASE ---
Legal Topics: ${JSON.stringify(legalKnowledge)}
Explanations: ${JSON.stringify(lawExplanations)}
Cases Dataset: ${JSON.stringify(casesDataset)}
`;
        
        // Setup Chat history if provided
        let chatContents = [];
        if (history && Array.isArray(history)) {
          // Format history: { role: 'user' | 'model', parts: [{text: '... '}] }
          history.forEach(msg => {
              chatContents.push({ 
                  role: msg.role === 'user' ? 'user' : 'model', 
                  parts: [{ text: msg.text }] 
              });
          });
        }
        
        // Add the current message
        chatContents.push({ role: 'user', parts: [{ text: message }] });

        // Call Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: chatContents,
            config: {
                systemInstruction: context,
                temperature: 0.3,
            }
        });

        res.json({ reply: response.text || "No response generated." });

    } catch (error) {
        console.error("Error connecting to Gemini:", error);
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
            return res.status(429).json({ error: "The AI is currently receiving too many requests. Please wait a minute and try again." });
        }
        res.status(500).json({ error: "Failed to generate a response. Please check your API Key and server logs!" });
    }
});

app.listen(port, () => {
    console.log(`Nyaybot Backend is running on http://localhost:${port}`);
    console.log(`Your friend can send POST requests to http://localhost:${port}/api/chat`);
});
