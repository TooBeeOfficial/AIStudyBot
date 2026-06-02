export async function saveQuizToDB(pool, userId, chatId, quizJSON) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const q of quizJSON.questions) {
      // 1. Insert question
      const questionResult = await client.query(
        `INSERT INTO questions (chat_id, user_id, question, correct_answer)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [chatId, userId, q.question, q.correct]
      );

      const questionId = questionResult.rows[0].id;

      // 2. Insert answers (multiple choice)
      for (const answer of q.answers) {
        await client.query(
          `INSERT INTO answers (question_id, answer_text)
           VALUES ($1, $2)`,
          [questionId, answer]
        );
      }
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DB insert error:", err);
    return { success: false, error: err.message };
  } finally {
    client.release();
  }
}