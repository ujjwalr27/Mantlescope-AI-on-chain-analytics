import Groq from "groq-sdk";
import { createGroq } from "@ai-sdk/groq";

// Singleton Groq client for direct SDK calls (structured analysis)
let _groq: Groq | null = null;
export function getGroqClient(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _groq;
}

// Vercel AI SDK provider for streaming chat
export const groqProvider = createGroq({ apiKey: process.env.GROQ_API_KEY });

export const ANALYSIS_MODEL = "llama-3.3-70b-versatile";
export const FAST_MODEL = "llama-3.1-8b-instant";
