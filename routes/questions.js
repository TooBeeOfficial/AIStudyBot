import express from "express";
import { Pool } from "pg";
import { Auth } from "../Utility/jwtToken.js";

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
});

router.get("/questionsCount/bychat", Auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.query;

    const questionsByChat = await pool.query(
      "SELECT COUNT(*) FROM questions WHERE user_id = $1 AND chat_id = $2",
      [userId, chatId],
    );
    const count = questionsByChat.rows[0].count;
    res.status(200).json(count);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

router.get("/questionsCount", Auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const questionsByChat = await pool.query(
      "SELECT COUNT(*) FROM questions WHERE user_id = $1",
      [userId],
    );
    const count = questionsByChat.rows[0].count;
    res.status(200).json(count);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

router.get("/questions", Auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.query;

    const result = await pool.query(
      "SELECT * FROM questions WHERE user_id = $1 AND chat_id = $2",
      [userId, chatId],
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

    const result = await pool.query(
      "SELECT id, question_id, answer_text FROM answers WHERE question_id = $1",
      [questionId],
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: "Question not found!" });
    }

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
      [questionId, userId],
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    const question = questionResult.rows[0];

    const answersResult = await pool.query(
      "SELECT id, question_id, answer_text FROM answers WHERE question_id = $1",
      [questionId],
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

    const result = await pool.query(
      `SELECT q.id AS question_id, q.chat_id, q.question, a.id AS answer_id, a.answer_text FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      WHERE q.user_id = $1 AND q.chat_id = $2 ORDER BY q.id, a.id`,
      [userId, chatId],
    );

    const quiz = [];
    const questionMap = new Map();

    for (const row of result.rows) {
      let question = questionMap.get(row.question_id);

      if (!question) {
        question = {
          id: row.question_id,
          chat_id: row.chat_id,
          question: row.question,
          answers: [],
        };

        questionMap.set(row.question_id, question);
        quiz.push(question);
      }

      if (row.answer_id !== null) {
        question.answers.push({
          id: row.answer_id,
          question_id: row.question_id,
          answer_text: row.answer_text,
        });
      }
    }

    res.json(quiz);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch quiz" });
  }
});

router.get("/question/correct", Auth, async (req, res) => {
  try {
    const { questionId } = req.query;

    const result = await pool.query(
      ` SELECT a.answer_text FROM answers a JOIN questions q ON a.question_id = q.id WHERE q.id = $1 AND a.id = q.correct_answer `,
      [questionId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch correct answer" });
  }
});

router.get("/question/checkAnswer", Auth, async (req, res) => {
  try {
    const { questionId, answerId } = req.query;

    const result = await pool.query(
      `
      SELECT correct_answer FROM questions WHERE id = $1`,
      [questionId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    return res.json(result.rows[0].correct_answer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to check correct answer" });
  }
});

router.get("/question/questionOnly", Auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.query;
    const result = await pool.query(
      "SELECT question FROM questions WHERE id = $1 AND user_id = $2",
      [questionId, userId],
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
    const { chatId } = req.query;
    const { question, answers, correct } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "Answers must be an array" });
    } else if (!answers.includes(correct)) {
      return res
        .status(400)
        .json({ error: "Correct answer must be in the list of answers." });
    }
    if (answers.length !== 4) {
      return res.status(400).json({ error: "Must have exactly 4 answers" });
    }
    if (answers.some((a) => typeof a !== "string" || a.trim() === "")) {
      return res.status(400).json({
        error: "All answers must be non-empty strings",
      });
    }
    if (
      typeof question !== "string" ||
      question.trim() === "" ||
      typeof correct !== "string" ||
      correct.trim() === ""
    ) {
      return res.status(400).json({
        error: "Question and correct answer must be non-empty strings",
      });
    }
    await pool.query("BEGIN");

    const questionResult = await pool.query(
      `INSERT INTO questions (chat_id, user_id, question, correct_answer) VALUES ($1, $2, $3, $4) RETURNING id`,
      [chatId, userId, question, null],
    );

    const questionId = questionResult.rows[0].id;
    let correctID = -1;
    for (const answer of answers) {
      const ans = await pool.query(
        `INSERT INTO answers (question_id, answer_text) VALUES ($1, $2) returning id, answer_text`,
        [questionId, answer],
      );
      if (ans.rows[0].answer_text === correct) {
        correctID = ans.rows[0].id;
      }
    }

    await pool.query(
      `UPDATE questions SET correct_answer = $1 WHERE id = $2 AND user_id = $3`,
      [correctID, questionId, userId],
    );

    await pool.query("COMMIT");
    res.status(200).json({ succes: "Created new question!" });
  } catch (error) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: "Failed to create question" });
  }
});

router.put("/question/update", Auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.query;
    const { question, answers, correct } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "Answers must be an array!" });
    } else if (!answers.some((ans) => ans.id === correct)) {
      return res
        .status(400)
        .json({ error: "Correct answer must be in the list of answers." });
    }
    if (answers.length !== 4) {
      return res.status(400).json({ error: "Must have exactly 4 answers" });
    }
    if (typeof question !== "string" || question.trim() === "") {
      return res.status(400).json({
        error: "Question must be non-empty strings",
      });
    }

    await pool.query("BEGIN");
    const insertedIds = [];

    for (const answer of answers) {
      const result = await pool.query(
        `UPDATE answers SET question_id = $1, answer_text = $2 WHERE id = $3 RETURNING id`,
        [questionId, answer.answer, answer.id],
      );
      insertedIds.push(result.rows[0].id);
    }

    await pool.query(
      `UPDATE questions SET question = $1, correct_answer = $4 WHERE id = $2 AND user_id = $3`,
      [question, questionId, userId, correct],
    );

    await pool.query("COMMIT");
    res.status(200).json({ message: "Update successfull." });
  } catch (error) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: "Failed to update question" });
  }
});

router.delete("/question/delete", Auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { questionId } = req.query;

    await pool.query("BEGIN");
    await pool.query(`DELETE FROM questions WHERE id = $1 AND user_id = $2`, [
      questionId,
      userId,
    ]);

    await pool.query("COMMIT");
    res.status(200).json({ message: "Delete successfull." });
  } catch (error) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error: "Failed to update question" });
  }
});

router.get("/chat/history", Auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.query;

    const chat = await pool.query(
      "SELECT id, role, content FROM messages WHERE user_id = $1 AND chat_id = $2",
      [userId, chatId],
    );

    res.status(200).json(chat.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to get history" });
  }
});

router.delete("/chat/delete", Auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.query;
    await pool.query("BEGIN");
    const chat = await pool.query(
      "DELETE FROM chats WHERE id = $1 AND user_id = $2 RETURNING *",
      [chatId, userId],
    );
    await pool.query("COMMIT");
    if (chat.rowCount === 0) {
      res.status(404).json({ error: "No chat to delete!" });
    } else {
      res.status(200).json({ success: "Deleted successfully!" });
    }
  } catch (error) {
    await pool.query("ROLLBACK");
    res.status(500).json({ error });
  }
});

router.get("/chat/lastmessage", Auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.query;

    const chat = await pool.query(
      `SELECT id, chat_id, role, content FROM messages
      WHERE user_id = $1 AND chat_id = $2
      UNION ALL SELECT -1 AS id, $2 AS chat_id, 'user' AS role, 'New Chat' AS content WHERE NOT EXISTS
      ( SELECT 1 FROM messages WHERE user_id = $1 AND chat_id = $2 )
      ORDER BY id ASC LIMIT 1; `,
      [userId, chatId],
    );

    res.status(200).json(chat.rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to get history" });
  }
});

router.get("/chat/lastmessage/all", Auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.query;

    const chats = await pool.query(
      `SELECT c.id AS chat_id, COALESCE (m.content, 'New Chat') AS content FROM chats c
      LEFT JOIN ( SELECT DISTINCT ON (chat_id) chat_id, content FROM messages
      WHERE user_id = $1 AND role = 'user' ORDER BY chat_id, id ASC ) m ON m.chat_id = c.id
      WHERE c.user_id = $1 ORDER BY c.id ASC; `,
      [userId],
    );

    return res.status(200).json(chats.rows);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get history" });
  }
});

router.get("/me/chats", Auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await pool.query("SELECT id FROM chats WHERE user_id = $1", [
      userId,
    ]);

    res.status(200).json(chats.rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to get history" });
  }
});

router.post("/me/newchat", Auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await pool.query(
      "INSERT INTO chats (user_id) VALUES ($1) RETURNING id",
      [userId],
    );

    return res.status(200).json(chats.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: "Failed to create chat" });
  }
});

export default router;
