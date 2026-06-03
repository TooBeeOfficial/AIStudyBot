import express from "express";
import passport from "passport";
import GoogleOidcStrategy from "passport-google-oidc";
import LocalStrategy from "passport-local";
import pg from "pg";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import PublicUser from "../models/userModel.js";

dotenv.config({});

const { Pool } = pg;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const router = express.Router();

router.post(
    "/login/google",
    passport.authenticate("google")
);

passport.use(
    new GoogleOidcStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "/api/oauth2/redirect/google",
            scope: ['profile', 'email'],
        },
        async function verify(issuer, profile, cb) {
            try {
                const credResult = await pool.query(
                    "SELECT * FROM federated_credentials WHERE provider = $1 AND subject = $2",
                    [issuer, profile.id]
                );
                let user;

                if (credResult.rows.length === 0) {
                    const email = profile.emails?.[0]?.value;

                    const userResult = await pool.query(
                        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email",
                        [profile.displayName, email]
                    );

                    const newUser = userResult.rows[0];

                    await pool.query(
                        "INSERT INTO federated_credentials (user_id, provider, subject) VALUES ($1, $2, $3)",
                        [newUser.id, issuer, profile.id]
                    );

                    user = newUser;
                } else {
                    const userResult = await pool.query(
                        "SELECT * FROM users WHERE id = $1",
                        [credResult.rows[0].user_id]
                    );

                    user = userResult.rows[0];
                }
                const token = jwt.sign(
                    { id: user.id, email },
                    process.env.JWT_SECRET,
                    { expiresIn: "7d" }
                );
                return cb(null, user);
            } catch (err) {
                return cb(err);
            }
        }
    )
);

router.post(
    "/login/email",
    passport.authenticate("local"),
    (req, res) => {
        res.json(req.user);
    }
);

passport.use(new LocalStrategy(
    {
        usernameField: "email",
        passwordField: "password",
    },
    async function verify(email, password, cb) {
        try {
            const user = await pool.query(
                "SELECT * FROM users WHERE email = $1",
                [email]
            );
            if (user.rowCount === 0) {
                return cb(null, false, {
                    message: "Invalid username or password."
                });
            }
            const isEqual = await bcrypt.compare(password, user.rows[0].password)

            if (!isEqual) { return cb(null, false, { message: 'Incorrect username or password.' }); }

            const token = jwt.sign(
                { id: user.rows[0].id, email },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );
            const userDetails = PublicUser.fromDbUser(user.rows[0])

            return cb(null, { token, userDetails });
        } catch (error) {
            return cb({ error })
        }                                                                                               
    }
))

router.post("/logout", (req, res, next) => {
    req.logout(function (err) {
        console.log("ERROR: ", err)
        if (err) return next(err);
        req.session.destroy(() => {
            res.clearCookie("connect.sid");
            res.json({ success: true });
        });
    });
});

passport.serializeUser((user, cb) => {
    process.nextTick(() => {
        cb(null, {
            id: user.id,
            name: user.name,
        });
    });
});

passport.deserializeUser((user, cb) => {
    process.nextTick(() => {
        cb(null, user);
    });
});

export default router;