import Cerebras from "@cerebras/cerebras_cloud_sdk";
import dotenv from "dotenv";
import AIModel from "../models/chatbotModels.js";
dotenv.config({ path: "./env/.env" });
const cerb = new Cerebras({ apiKey: process.env.GROQ_API_KEY });

export async function AskChatBot(userMessage, botModel) {
  if (botModel) {
  }
  try {
    const res = await cerb.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            'Create a quiz from the user input; Give at most 10 questions;if insufficient info, use web search for related content; return ONLY valid JSON in format and only the questions: {"questions":[{"question":"string","answers":["string","string","string","string"],"correct":"string"}]}; each question must have 1 correct and 3 incorrect unique answers.',
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      stream: false,
      model: botModel.modelName,
      temperature: 0.5,
      max_completion_tokens: botModel.maxCompletionTokens,
      top_p: 1,
      response_format: {
        type: "json_object",
      },
    });
    console.log(res.choices[0].message.reasoning);
    if (botModel.id === 3) {
      return parseQuestions(res.choices[0].message.reasoning);
    }
    return parseQuestions(res.choices[0].message.content);
  } catch (error) {
    console.log(error);
    if (error?.status === 429) {
      return {
        error: true,
        status: error?.status,
        message: "Rate limit exceeded (429). Please try again later.",
      };
    } else {
      return {
        error: true,
        status: error?.status,
        message: "Something went wrong!",
      };
    }
  }
}

export function parseQuestions(input) {
  try {
    let cleaned = "";

    if (typeof cleaned !== "string") {
      cleaned = JSON.stringify(input);
    } else {
      cleaned = input;
    }
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
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse questions JSON:", error);
    return null;
  }
}
