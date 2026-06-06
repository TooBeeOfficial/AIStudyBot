import GroqModel from "../models/chatbotModels.js";
import express from "express";
import { Auth } from "../Utility/jwtToken.js";

const router = express.Router();

router.use(express.json());
router.get("/models", async (req, res) => {
    try {
        const content = GroqModel.publicList()
        res.json( content );
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
});
export default router;