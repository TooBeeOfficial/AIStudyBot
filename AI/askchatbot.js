import { Groq } from 'groq-sdk';
import dotenv from "dotenv";
import GroqModel from '../models/chatbotModels.js';
dotenv.config({path:"./env/.env"});
const groq = new Groq({apiKey:process.env.GROQ_API_KEY});

export async function AskChatBot(userMessage, botModel){
    if (!botModel?.modelName) {
        throw new Error("Invalid model supplied");
    }
    try {
        const res = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content:"Create quiz questions and 4 answers table from text, use JSON to seperate questions, Return only JSON no wrapping,Return a valid JSON object in the format: { 'questions': [ { 'question': '', 'answers': ['', '', '', ''], 'correct': '' } ] }",
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

    // If it's a string, normalize it
    if (typeof cleaned === "string") {
      cleaned = cleaned
        .replace(/\\n/g, "")
        .replace(/\\"/g, '"')
        .trim();
    }

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse questions JSON:", error);
    return null;
  }
}
