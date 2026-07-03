import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import GroqModel from "../models/chatbotModels.js";
dotenv.config({ path: "./env/.env" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function AskChatBot(userMessage, botModel) {
  if (botModel) {
  }
  try {
    const websearch = botModel.searchWeb;
    const res = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            'Create a quiz from the user input; if insufficient info, use web search for related content; return ONLY valid JSON in format: {"questions":[{"question":"string","answers":["string","string","string","string"],"correct":"string"}]}; each question must have 1 correct and 3 incorrect unique answers.',
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      model: botModel.modelName,
      temperature: 1,
      max_completion_tokens: botModel.maxCompletionTokens,
      top_p: 1,
    });
    return parseQuestions(res.choices[0].message.content);
  } catch (error) {
    console.error("Groq API error:", error);
    throw error;
  }
}

export function parseQuestions(input) {
  try {
    let cleaned = input;

    if (typeof cleaned === "string") {
      cleaned = cleaned
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .replace(/\\n/g, "")
        .replace(/\\"/g, '"')
        .trim();

      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");

      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }
    }

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse questions JSON:", error);
    return null;
  }
}
