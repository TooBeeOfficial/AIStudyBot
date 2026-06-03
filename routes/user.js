import express from "express";
import postgresSQL from "pg";
import dotenv from "dotenv"
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
import PublicUser from "../models/userModel.js";
import { Auth } from "../Utility/jwtToken.js";

dotenv.config();
const { Pool } = postgresSQL;
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const router = express.Router();
router.use(express.json());

router.get("/me", Auth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        const user = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [req.user.email]
        );
        const publicUser = PublicUser.fromDbUser(user.rows[0])
        res.json({ publicUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

export default router;