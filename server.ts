import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Gemini API proxy — keeps API key server-side
  app.post("/api/gemini/generate", async (req, res) => {
    const { prompt, config, systemInstruction } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Gemini API key not configured" });
      return;
    }
    const ai = new GoogleGenAI({ apiKey });
    const models = [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite-preview",
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
    ];
    let lastError: unknown = null;
    for (const modelName of models) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: { ...config, systemInstruction },
        });
        const text = response.text;
        if (text) {
          res.json({ text });
          return;
        }
      } catch (err) {
        lastError = err;
      }
    }
    console.error("All Gemini models failed:", lastError);
    res.status(502).json({ error: "Gemini API unavailable" });
  });

  // Mock endpoint for In-App Purchase verification
  // In a real mobile app, this would verify the receipt with Google/Apple
  app.post("/api/verify-purchase", async (req, res) => {
    const { purchaseToken, resumeId, userId } = req.body;
    
    // Logic to verify purchaseToken with Play Store / App Store
    // For now, we'll just return success to simulate the flow
    console.log(`Verifying purchase for resume ${resumeId} by user ${userId}`);
    
    res.json({ 
      success: true, 
      message: "Purchase verified successfully",
      resumeId 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
