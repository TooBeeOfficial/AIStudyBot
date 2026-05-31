import express from "express";
import postgresSQL from "pg";
import dotenv from "dotenv"
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
import PublicUser from "../models/userModel.js";

/* This file is use for user API endpoints
*   
*   Endpoints:
*   /api/users = All returns all users.
*   /api/signup = Registers a user.
*   /api/login = If user credentials are correct creates a JWToken.
*
*/

dotenv.config();
const { Pool } = postgresSQL;
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const router = express.Router();
router.use(express.json());

router.get("/users", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM users",
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong"});
    }
});

router.post("/signup", async (req,res)=>{
    try {
        const { email, password, name } = req.body;
        if (!email || !password || !name) {
        return res.status(400).json({
            error: "Name, email, and password are required"
        });
        }
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );
        const user = result;
        if (user.rows.length > 0){
            res.json({ error: "User already exists" });
        }
        else{
            const hashedPassword = await bcrypt.hash(password, 12);
            const newUser = await pool.query(
                "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, email",
                [name, email, hashedPassword]
            );
            res.status(201).json({ response: "User created sucsessfully." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
        error: "Server error"
        });
    }
})

router.post("/signin", async (req, res) => {
    const { email, password } = req.body;

    const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );
    const user = result.rows[0];

    if (!user) {
            return res.status(400).json({
                error: "Wrong email or password"
            });
        }
        const isValid = await bcrypt.compare(password, user.password);
        if(isValid){
            const token = jwt.sign(
                { email },
                process.env.JWT_SECRET,
                { expiresIn: "15m" }
            );
            const publicUser = PublicUser.fromDbUser(user);
            res.json({
                token:token,
                user:publicUser
             });
        }else{
            res.status(500).json({ error: "Server error" });
        }
    }
);

export default router;