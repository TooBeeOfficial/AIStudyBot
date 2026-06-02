import { AskChatBot } from "../AI/askchatbot.js";
import GroqModel from "../models/chatbotModels.js";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { Auth } from "../Utility/jwtToken.js";

const router = express.Router();

router.use(express.json());
router.post("/router/chat", async (req, res) => {
    try {
        const message = req.body.message;
        const model = req.body.model;

        const content = await AskChatBot(
            message,
            GroqModel.getModelById(model)
        );
        res.json({ "Success": true,content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
});
export default router;