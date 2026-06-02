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
router.post("/chat", async (req, res) => {
    try {
        const message = req.body.message;
        const model = req.body.model;

        const content = await AskChatBot(
            message,
            GroqModel.getModelById(model)
        );
        saveQuizToDB(pool,1,1,content)
        res.json({ "Success": true, content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
});
export default router;