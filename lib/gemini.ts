import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "missing_api_key" });
  }
  return client;
}

export async function summarize(prompt: string): Promise<string> {
  const response = await getClient().models.generateContent({
    model: "gemini-flash-lite-latest",
    contents: prompt,
  });

  return (response.text ?? "").trim();
}
