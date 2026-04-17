/// <reference types="vite/client" />
import { Type } from "@google/genai";

const API_URL = import.meta.env.VITE_API_URL || "https://resume-ai.onrender.com";

async function generateWithFallback(prompt: string, config?: any, systemInstruction?: string): Promise<string> {
  const response = await fetch(`${API_URL}/api/gemini/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, config, systemInstruction }),
  });
  if (!response.ok) {
    throw new Error(`Gemini proxy error: ${response.status}`);
  }
  const data = await response.json();
  if (!data.text) throw new Error("Empty response from Gemini proxy");
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
    return await generateWithFallback(
      prompt,
      {},
      "You are a professional resume optimizer specializing in ATS-friendly content."
    );
  } catch (error) {
    console.error("Gemini Error:", error);
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
    return await generateWithFallback(prompt);
  } catch (error) {
    console.error("Gemini Error:", error);
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
    const text = await generateWithFallback(prompt, {
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
    console.error("Gemini Error:", error);
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
    const text = await generateWithFallback(prompt, {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          personalInfo: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              location: { type: Type.STRING },
              linkedin: { type: Type.STRING },
              github: { type: Type.STRING },
            },
          },
          summary: { type: Type.STRING },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                company: { type: Type.STRING },
                role: { type: Type.STRING },
                location: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                description: { type: Type.STRING },
              },
            },
          },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                school: { type: Type.STRING },
                degree: { type: Type.STRING },
                field: { type: Type.STRING },
                location: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
              },
            },
          },
          skills: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                items: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
            },
          },
          projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                link: { type: Type.STRING },
              },
            },
          },
        },
      },
    });
    return JSON.parse(text || "{}");
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};
