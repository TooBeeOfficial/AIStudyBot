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

router.get("/question/questionOnly", Auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionId } = req.query;
        console.log(questionId)
        const result = await pool.query(
            "SELECT question FROM questions WHERE id = $1 AND user_id = $2",
            [questionId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Question not found" });
        }

        res.json({ question: result.rows[0].question });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch correct answer" });
    }
});

router.post("/question/create", Auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { question, answers, correct } = req.body;
        const { chatId } = req.query;

        if (!Array.isArray(answers)) {
            return res.status(400).json({ error: "Answers must be an array" });
        } else if (!answers.includes(correct)) {
            return res.status(400).json({ error: "Correct answer must be in the list of answers." });
        }
        if (answers.length !== 4) {
            return res.status(400).json({ error: "Must have exactly 4 answers" });
        }
        if (answers.some(a => typeof a !== "string" || a.trim() === "")) {
            return res.status(400).json({
                error: "All answers must be non-empty strings"
            });
        }
        if ((typeof question !== "string" || question.trim() === "") || (typeof correct !== "string" || correct.trim() === "")) {
            return res.status(400).json({
                error: "Question and correct answer must be non-empty strings"
            });
        }
        await pool.query("BEGIN");

        const questionResult = await pool.query(
            `INSERT INTO questions (chat_id, user_id, question, correct_answer) VALUES ($1, $2, $3, $4) RETURNING id`,
            [chatId, userId, question, correct]
        );
        console.log(questionResult)

        const questionId = questionResult.rows[0].id;

        for (const answer of answers) {
            await pool.query(
                `INSERT INTO answers (question_id, answer_text) VALUES ($1, $2)`,
                [questionId, answer]
            );
        }
        await pool.query("COMMIT");
        res.status(200).json({ succes: "Created new question!" })
    } catch (error) {
        await pool.query("ROLLBACK");
        res.status(500).json({ error: "Failed to create question" });
    }
})

router.put("/question/update", Auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionId } = req.query;
        const { question, answers, correct } = req.body;
        if (!Array.isArray(answers)) {
            return res.status(400).json({ error: "Answers must be an array" });
        } else if (!answers.includes(correct)) {
            return res.status(400).json({ error: "Correct answer must be in the list of answers." });
        }
        if (answers.length !== 4) {
            return res.status(400).json({ error: "Must have exactly 4 answers" });
        }
        if (answers.some(a => typeof a !== "string" || a.trim() === "")) {
            return res.status(400).json({
                error: "All answers must be non-empty strings"
            });
        }
        if ((typeof question !== "string" || question.trim() === "") || (typeof correct !== "string" || correct.trim() === "")) {
            return res.status(400).json({
                error: "Question and correct answer must be non-empty strings"
            });
        }

        await pool.query("BEGIN");
        const questionResult = await pool.query(
            `UPDATE questions SET question = $1, correct_answer = $2 WHERE id = $3 AND user_id = $4 RETURNING id`,
            [question, correct, questionId, userId]
        );

        const newQuestionId = questionResult.rows[0].id
        await pool.query(
            `DELETE FROM answers WHERE question_id = $1`,
            [newQuestionId]
        );

        for (const answer of answers) {
            await pool.query(
                `INSERT INTO answers (question_id, answer_text) VALUES ($1, $2)`,
                [newQuestionId, answer]
            );
        }
        await pool.query("COMMIT");
        res.status(200).json({ message: "Update successfull." })
    } catch (error) {
        await pool.query("ROLLBACK");
        res.status(500).json({ error: "Failed to update question" });
    }
})

router.delete("/question/delete", Auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { questionId } = req.query;

        await pool.query("BEGIN");
        await pool.query(
            `DELETE FROM questions WHERE id = $1 AND user_id = $2`,
            [questionId, userId]
        );

        await pool.query("COMMIT");
        res.status(200).json({ message: "Delete successfull." })
    } catch (error) {
        await pool.query("ROLLBACK");
        res.status(500).json({ error: "Failed to update question" });
    }
})

export default router;