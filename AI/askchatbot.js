import { Groq } from "groq-sdk";
import dotenv from "dotenv";
import GroqModel from "../models/chatbotModels.js";
dotenv.config({ path: "./env/.env" });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function AskChatBot(userMessage, botModel) {
  if (!botModel?.modelName) {
    throw new Error("Invalid model supplied");
  }
  try {
    const res = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            'Create a quiz with as many questions from the user input as possible, if there isn"t enough content to create a quiz get from the web as related as possible.Return ONLY valid JSON. all answers must be different and only 1 correct answer with 3 wrong answers.if there isn"t enough content to create a quiz pull someting related from the web.Use this exact format: { "questions": [ { "question": "string", "answers": ["string", "string", "string", "string"], "correct": "string" } ] }',
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      response_format: { type: "json_object" },
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
