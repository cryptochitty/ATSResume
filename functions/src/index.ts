import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { GoogleGenAI } from "@google/genai";

admin.initializeApp();

// Secrets — set via: firebase functions:secrets:set GEMINI_API_KEY
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");
const GROQ_API_KEY = defineSecret("GROQ_API_KEY");
const OPENROUTER_API_KEY = defineSecret("OPENROUTER_API_KEY");

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerateRequest {
  prompt: string;
  config?: { responseMimeType?: string; responseSchema?: unknown };
  systemInstruction?: string;
}

const wantsJson = (req: GenerateRequest) =>
  req.config?.responseMimeType === "application/json";

// ─── Provider: Google Gemini (free tier, works on Spark plan) ─────────────────

async function tryGemini(
  opts: GenerateRequest,
  apiKey: string
): Promise<string | null> {
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

// ─── Provider: Groq (free tier — Llama 3.3 70B, requires Blaze plan) ──────────

async function tryGroq(
  opts: GenerateRequest,
  apiKey: string
): Promise<string | null> {
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
      const resp = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
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
            ...(wantsJson(opts) && {
              response_format: { type: "json_object" },
            }),
            temperature: 0.3,
          }),
        }
      );

      if (!resp.ok) continue;
      const data = (await resp.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } catch {
      // try next model
    }
  }
  return null;
}

// ─── Provider: OpenRouter (free :free models, requires Blaze plan) ─────────────

async function tryOpenRouter(
  opts: GenerateRequest,
  apiKey: string
): Promise<string | null> {
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
      const resp = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
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
            ...(wantsJson(opts) && {
              response_format: { type: "json_object" },
            }),
            temperature: 0.3,
          }),
        }
      );

      if (!resp.ok) continue;
      const data = (await resp.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } catch {
      // try next model
    }
  }
  return null;
}

// ─── Callable Function ────────────────────────────────────────────────────────

export const generateAI = onCall(
  {
    secrets: [GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY],
    region: "us-central1",
    timeoutSeconds: 60,
  },
  async (request) => {
    const { prompt, config, systemInstruction } =
      request.data as GenerateRequest;

    if (!prompt) {
      throw new HttpsError("invalid-argument", "prompt is required");
    }

    const opts: GenerateRequest = { prompt, config, systemInstruction };

    // Fallback chain: Gemini → Groq → OpenRouter
    const geminiKey = GEMINI_API_KEY.value();
    if (geminiKey) {
      const text = await tryGemini(opts, geminiKey);
      if (text) return { text };
    }

    const groqKey = GROQ_API_KEY.value();
    if (groqKey) {
      const text = await tryGroq(opts, groqKey);
      if (text) return { text };
    }

    const openrouterKey = OPENROUTER_API_KEY.value();
    if (openrouterKey) {
      const text = await tryOpenRouter(opts, openrouterKey);
      if (text) return { text };
    }

    throw new HttpsError(
      "unavailable",
      "All AI providers failed or no keys configured"
    );
  }
);
