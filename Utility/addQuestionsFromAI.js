import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config()

const pool = new Pool(
    {
        connectionString: process.env.DATABASE_URL,
    }
)

export async function saveQuizToDB(userId, chatId, quizJSON, message) {
    await pool.query("BEGIN");
    try {
        await pool.query(
            "INSERT INTO messages (chat_id, user_id, role, content) VALUES ($1, $2, $3, $4)",
            [chatId, userId, "user", message]
        )
        await pool.query(
            "INSERT INTO messages (chat_id, user_id, role, content) VALUES ($1, $2, $3, $4)",
            [chatId, userId, "assistant", JSON.stringify(quizJSON)]
        )
        for (const q of quizJSON.questions) {
            const questionResult = await pool.query(
                `INSERT INTO questions (chat_id, user_id, question, correct_answer) VALUES ($1, $2, $3, $4) RETURNING id`,
                [chatId, userId, q.question, q.correct]
            );

            const questionId = questionResult.rows[0].id;

            for (const answer of q.answers) {
                await pool.query(
                    `INSERT INTO answers (question_id, answer_text) VALUES ($1, $2)`,
                    [questionId, answer]
                );
            }
        }
        await pool.query("COMMIT");
        return { success: true };
    } catch (err) {
        await pool.query("ROLLBACK");
        return { success: false, error: err.message };
    }
}