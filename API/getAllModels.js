import GroqModel from "../AI/models/chatbotModels.js";
import express from "express";

const router = express.Router();

router.use(express.json());
router.get("/models", async (req, res) => {
    try {
        const content = GroqModel.publicList()
        res.json({ content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
});
export default router;