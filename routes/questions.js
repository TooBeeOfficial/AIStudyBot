import express from "express"
import { Pool } from "pg";
import { Auth } from "../Utility/jwtToken.js";

const router = express.Router();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

router.get("/questionsCount/bychat", Auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatId } = req.query;

        const questionsByChat = await pool.query(
            "SELECT COUNT(*) FROM questions WHERE user_id = $1 AND chat_id = $2",
            [userId, chatId]
        )
        const count = questionsByChat.rows[0].count;
        res.status(200).json(count)
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch questions" });
    }
})

router.get("/questionsCount", Auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const questionsByChat = await pool.query(
            "SELECT COUNT(*) FROM questions WHERE user_id = $1",
            [userId]
        )
        const count = questionsByChat.rows[0].count;
        res.status(200).json(count)
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch questions" });
    }
})

router.get("/questions", Auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatId } = req.query;

        console.log(userId, chatId)
        const result = await pool.query(
            "SELECT * FROM questions WHERE user_id = $1 AND chat_id = $2",
            [userId, chatId]
        );

        res.json(result.rows);
    } catch (err) {

        res.status(500).json({ error: "Failed to fetch questions" });
    }
});

router.get("/answers", Auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionId } = req.query;

        const check = await pool.query(
            "SELECT id FROM questions WHERE id = $1 AND user_id = $2",
            [questionId, userId]
        );

        if (check.rows.length === 0) {
            return res.status(403).json({ error: "Not found or unauthorized" });
        }

        const result = await pool.query(
            "SELECT * FROM answers WHERE question_id = $1",
            [questionId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch answers" });
    }
});

router.get("/question/full", Auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionId } = req.query;

        const questionResult = await pool.query(
            "SELECT * FROM questions WHERE id = $1 AND user_id = $2",
            [questionId, userId]
        );

        if (questionResult.rows.length === 0) {
            return res.status(404).json({ error: "Question not found" });
        }

        const question = questionResult.rows[0];

        const answersResult = await pool.query(
            "SELECT * FROM answers WHERE question_id = $1",
            [questionId]
        );

        res.json({
            ...question,
            answers: answersResult.rows,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch question" });
    }
});

router.get("/quiz", Auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatId } = req.query;

        const questionsResult = await pool.query(
            "SELECT * FROM questions WHERE user_id = $1 AND chat_id = $2",
            [userId, chatId]
        );

        const fullQuiz = await Promise.all(
            questionsResult.rows.map(async (q) => {
                const answersResult = await pool.query(
                    "SELECT * FROM answers WHERE question_id = $1",
                    [q.id]
                );

                return {
                    ...q,
                    answers: answersResult.rows,
                };
            })
        );

        res.json(fullQuiz);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch quiz" });
    }
});

router.get("/question/correct", Auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionId } = req.query;

        const result = await pool.query(
            "SELECT correct_answer FROM questions WHERE id = $1 AND user_id = $2",
            [questionId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Question not found" });
        }

        res.json({ correct: result.rows[0].correct_answer });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch correct answer" });
    }
});

export default router;