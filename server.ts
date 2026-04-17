import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── AI Provider Fallback Chain ───────────────────────────────────────────────

interface GenerateOptions {
  prompt: string;
  config?: { responseMimeType?: string; responseSchema?: unknown };
  systemInstruction?: string;
}

const wantsJson = (opts: GenerateOptions) =>
  opts.config?.responseMimeType === "application/json";

// Provider 1: Google Gemini (free tier)
async function tryGemini(opts: GenerateOptions): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const models = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite-preview",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
  ];

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: opts.prompt,
        config: { ...opts.config, systemInstruction: opts.systemInstruction },
      });
      const text = response.text;
      if (text) return text;
    } catch {
      // try next model
    }
  }
  return null;
}

// Provider 2: Groq (free tier — Llama 3.3 70B, fast)
async function tryGroq(opts: GenerateOptions): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
  ];

  const systemMsg = wantsJson(opts)
    ? `${opts.systemInstruction || "You are a helpful assistant."} Always respond with valid JSON only. No markdown, no explanation.`
    : opts.systemInstruction || "You are a helpful assistant.";

  for (const model of models) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemMsg },
            { role: "user", content: opts.prompt },
          ],
          ...(wantsJson(opts) && { response_format: { type: "json_object" } }),
          temperature: 0.3,
        }),
      });

      if (!resp.ok) continue;
      const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } catch {
      // try next model
    }
  }
  return null;
}

// Provider 3: OpenRouter (free models — Llama, Mistral, Gemma)
async function tryOpenRouter(opts: GenerateOptions): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const models = [
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "google/gemma-2-9b-it:free",
    "qwen/qwen-2-7b-instruct:free",
  ];

  const systemMsg = wantsJson(opts)
    ? `${opts.systemInstruction || "You are a helpful assistant."} Always respond with valid JSON only. No markdown, no explanation.`
    : opts.systemInstruction || "You are a helpful assistant.";

  for (const model of models) {
    try {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://resume-ai.onrender.com",
          "X-Title": "ResumeAI",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemMsg },
            { role: "user", content: opts.prompt },
          ],
          ...(wantsJson(opts) && { response_format: { type: "json_object" } }),
          temperature: 0.3,
        }),
      });

      if (!resp.ok) continue;
      const data = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } catch {
      // try next model
    }
  }
  return null;
}

// Fallback chain: Gemini → Groq → OpenRouter
async function generateWithFallback(opts: GenerateOptions): Promise<string> {
  const result =
    (await tryGemini(opts)) ??
    (await tryGroq(opts)) ??
    (await tryOpenRouter(opts));

  if (!result) throw new Error("All AI providers failed or no keys configured");
  return result;
}

// ─── Express Server ───────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // AI generate endpoint — tries Gemini → Groq → OpenRouter
  app.post("/api/gemini/generate", async (req, res) => {
    const { prompt, config, systemInstruction } = req.body;
    if (!prompt) {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    try {
      const text = await generateWithFallback({ prompt, config, systemInstruction });
      res.json({ text });
    } catch (err) {
      console.error("All AI providers failed:", err);
      res.status(502).json({ error: "AI service unavailable. Please try again later." });
    }
  });

  // Mock endpoint for In-App Purchase verification
  app.post("/api/verify-purchase", async (req, res) => {
    const { resumeId, userId } = req.body;
    console.log(`Verifying purchase for resume ${resumeId} by user ${userId}`);
    res.json({ success: true, message: "Purchase verified successfully", resumeId });
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
