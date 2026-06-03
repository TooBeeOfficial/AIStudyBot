import { AskChatBot } from "../AI/askchatbot.js";
import GroqModel from "../models/chatbotModels.js";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { Auth } from "../Utility/jwtToken.js";
import { saveQuizToDB } from "../Utility/addQuestionsFromAI.js";
import { Pool } from "pg";

const router = express.Router();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
router.use(express.json());
router.post("/chat", Auth, async (req, res) => {
    try {
        const message = req.body.message;
        const model = req.body.model;
        const userId = req.user.id;
        const { chatId } = req.query;

        const content = await AskChatBot(
            message,
            GroqModel.getModelById(model)
        );
        await saveQuizToDB(userId, chatId, content)
        res.json({ "Success": true, content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
});
export default router;