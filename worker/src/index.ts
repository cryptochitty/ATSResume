export interface Env {
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
  OPENROUTER_API_KEY: string;
}

interface GenerateRequest {
  prompt: string;
  config?: { responseMimeType?: string };
  systemInstruction?: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const wantsJson = (req: GenerateRequest) =>
  req.config?.responseMimeType === "application/json";

// ─── Provider: Gemini ─────────────────────────────────────────────────────────

async function tryGemini(opts: GenerateRequest, apiKey: string): Promise<string | null> {
  const models = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite-preview",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
  ];

  for (const model of models) {
    try {
      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: opts.prompt }] }],
      };
      if (opts.systemInstruction) {
        body.systemInstruction = { parts: [{ text: opts.systemInstruction }] };
      }
      if (wantsJson(opts)) {
        body.generationConfig = { responseMimeType: "application/json" };
      }

      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!resp.ok) continue;
      const data = await resp.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch {
      // try next model
    }
  }
  return null;
}

// ─── Provider: Groq ───────────────────────────────────────────────────────────

async function tryGroq(opts: GenerateRequest, apiKey: string): Promise<string | null> {
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
  const systemMsg = wantsJson(opts)
    ? `${opts.systemInstruction || "You are a helpful assistant."} Always respond with valid JSON only.`
    : opts.systemInstruction || "You are a helpful assistant.";

  for (const model of models) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
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
      const data = await resp.json() as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } catch {
      // try next model
    }
  }
  return null;
}

// ─── Provider: OpenRouter ─────────────────────────────────────────────────────

async function tryOpenRouter(opts: GenerateRequest, apiKey: string): Promise<string | null> {
  const models = [
    "meta-llama/llama-3.1-8b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
    "google/gemma-2-9b-it:free",
  ];
  const systemMsg = wantsJson(opts)
    ? `${opts.systemInstruction || "You are a helpful assistant."} Always respond with valid JSON only.`
    : opts.systemInstruction || "You are a helpful assistant.";

  for (const model of models) {
    try {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://resumeai.app",
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
      const data = await resp.json() as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } catch {
      // try next model
    }
  }
  return null;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS });
    }

    let opts: GenerateRequest;
    try {
      opts = await request.json() as GenerateRequest;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    if (!opts.prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Fallback chain: Gemini → Groq → OpenRouter
    let text: string | null = null;

    if (env.GEMINI_API_KEY) text = await tryGemini(opts, env.GEMINI_API_KEY);
    if (!text && env.GROQ_API_KEY) text = await tryGroq(opts, env.GROQ_API_KEY);
    if (!text && env.OPENROUTER_API_KEY) text = await tryOpenRouter(opts, env.OPENROUTER_API_KEY);

    if (!text) {
      return new Response(JSON.stringify({ error: "All AI providers failed" }), {
        status: 502,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  },
};
