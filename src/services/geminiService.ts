/// <reference types="vite/client" />
import { Type } from "@google/genai";

const WORKER_URL = import.meta.env.VITE_WORKER_URL || "https://resumeai-worker.workers.dev";

async function generate(
  prompt: string,
  config?: unknown,
  systemInstruction?: string
): Promise<string> {
  const resp = await fetch(`${WORKER_URL}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, config, systemInstruction }),
  });
  if (!resp.ok) throw new Error(`Worker error: ${resp.status}`);
  const data = await resp.json() as { text: string };
  return data.text;
}

export const rewriteExperience = async (description: string, role: string) => {
  const prompt = `
    You are an expert resume writer. Rewrite the following job description using the Google XYZ formula:
    "Accomplished [X] as measured by [Y], by doing [Z]".
    Focus on quantifying impact and using strong action verbs.

    Role: ${role}
    Current Description: ${description}

    Provide 3-5 high-impact bullet points.
  `;

  try {
    return await generate(
      prompt,
      {},
      "You are a professional resume optimizer specializing in ATS-friendly content."
    );
  } catch (error) {
    console.error("AI Error:", error);
    return description;
  }
};

export const generateSummary = async (experience: string, skills: string) => {
  const prompt = `
    Generate a professional summary for a resume based on the following:
    Experience: ${experience}
    Skills: ${skills}

    Keep it concise (3-4 sentences), impactful, and ATS-optimized.
  `;

  try {
    return await generate(prompt);
  } catch (error) {
    console.error("AI Error:", error);
    return "";
  }
};

export const scoreResume = async (resumeText: string) => {
  const prompt = `
    Score this resume for ATS compatibility on a scale of 0-100.
    Provide the score and 3 key areas for improvement.

    Resume Content:
    ${resumeText}
  `;

  try {
    const text = await generate(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          improvements: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["score", "improvements"],
      },
    });
    return JSON.parse(text || "{}");
  } catch (error) {
    console.error("AI Error:", error);
    return { score: 0, improvements: [] };
  }
};

export const parseProfileData = async (rawText: string) => {
  const prompt = `
    Extract resume information from the following raw text (could be a LinkedIn profile export, GitHub bio, or general bio).
    Return a structured JSON object matching this schema:
    {
      "personalInfo": { "fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "" },
      "summary": "",
      "experience": [{ "company": "", "role": "", "location": "", "startDate": "", "endDate": "", "description": "" }],
      "education": [{ "school": "", "degree": "", "field": "", "location": "", "startDate": "", "endDate": "" }],
      "skills": [{ "category": "", "items": [] }],
      "projects": [{ "name": "", "description": "", "link": "" }]
    }

    Raw Text:
    ${rawText}
  `;

  try {
    const text = await generate(prompt, {
      responseMimeType: "application/json",
    });
    return JSON.parse(text || "{}");
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};
