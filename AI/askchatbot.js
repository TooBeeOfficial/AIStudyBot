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
                    content:"Create questions and answer quiz from the text. Make use of markown to seperate each question from eachother and their answers.",
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
        return res.choices[0].message.content;
    } catch (error) {
        console.error("Groq API error:", error);
        throw error;
    }
}
