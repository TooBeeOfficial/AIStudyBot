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
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
});
router.use(express.json());
router.post("/chat", Auth, async (req, res) => {
  try {
    const message = req.body.message;
    const model = req.body.model;
    const userId = req.user.id;
    const { chatId } = req.query;

    if (typeof message !== "string" || message.trim() === "") {
      res
        .status(500)
        .json({ error: "Message or Text must be non empty string." });
    }
    if (userId === undefined || userId === null) {
      res.status(500).json({ error: "User id is undefined." });
    }
    if (chatId === undefined || chatId === null) {
      res.status(500).json({ error: "Chat id is undefined." });
    }

    const content = await AskChatBot(message, GroqModel.getModelById(model));
    await saveQuizToDB(userId, chatId, content, message);
    return res.status(200).json(content);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});
export default router;
