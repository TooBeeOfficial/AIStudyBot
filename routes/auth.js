import express from "express";
import passport from "passport";
import GoogleOidcStrategy from "passport-google-oidc";
import LocalStrategy from "passport-local";
import pg from "pg";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import PublicUser from "../models/userModel.js";
import z from "zod";
import path from "node:path";

dotenv.config({});

const emailSchema = z.string().email();
const isProd = process.env.PROD;
const { Pool } = pg;
export const pool = new Pool({
  errorLog: console.error.bind(console),
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : false,
});

const router = express.Router();

router.get(
  "/login/google",
  (req, res, next) => {
    console.log("LOGIN SESSION:", req.sessionID);
    console.log("LOGIN COOKIE:", req.headers.cookie);
    next();
  },
  passport.authenticate("google", { failWithError: true }),
);

passport.use(
  new GoogleOidcStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://aistudybot.onrender.com/api/oauth2/redirect/google",
      scope: ["profile", "email"],
    },
    async function verify(issuer, profile, cb) {
      try {
        const credResult = await pool.query(
          "SELECT * FROM federated_credentials WHERE provider = $1 AND subject = $2",
          [issuer, profile.id],
        );
        let user;

        if (credResult.rows.length === 0) {
          const email = profile.emails?.[0]?.value;

          const userResult = await pool.query(
            "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email",
            [profile.displayName, email],
          );

          const newUser = userResult.rows[0];

          await pool.query(
            "INSERT INTO federated_credentials (user_id, provider, subject) VALUES ($1, $2, $3)",
            [newUser.id, issuer, profile.id],
          );

          user = newUser;
        } else {
          const userResult = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [credResult.rows[0].user_id],
          );

          user = userResult.rows[0];
        }

        return cb(null, user);
      } catch (err) {
        return cb(err);
      }
    },
  ),
);

router.get(
  "/oauth2/redirect/google",
  (req, res, next) => {
    console.log("CALLBACK SESSION:", req.sessionID);
    console.log("CALLBACK COOKIE:", req.headers.cookie);
    console.log("CALLBACK SESSION DATA:", req.session);
    next();
  },
  passport.authenticate("google", { session: false, failWithError: true }),
  async (req, res) => {
    try {
      const result = await pool.query(
        `INSERT INTO oauth_login_codes (user_id, expires_at)
         VALUES ($1, NOW() + INTERVAL '1 minute')
         RETURNING code`,
        [req.user.id],
      );

      const code = result.rows[0].code;

      return res.redirect(
        `https://quiz-studybuddy.onrender.com/oauth-callback?code=${code}`,
      );
    } catch (err) {
      console.error(err);
      return res.status(500).send("Internal server error");
    }
  },
);

router.post("/auth/exchange", async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({
      error: "Missing code",
    });
  }

  try {
    await pool.query("BEGIN");

    const codeResult = await pool.query(
      `DELETE FROM oauth_login_codes
       WHERE code = $1
         AND expires_at > NOW()
       RETURNING user_id`,
      [code],
    );

    if (codeResult.rowCount === 0) {
      await pool.query("ROLLBACK");

      return res.status(401).json({
        error: "Invalid or expired code",
      });
    }

    const userResult = await pool.query(
      `SELECT id, email, name
       FROM users
       WHERE id = $1`,
      [codeResult.rows[0].user_id],
    );

    if (userResult.rowCount === 0) {
      await pool.query("ROLLBACK");

      return res.status(404).json({
        error: "User not found",
      });
    }
    const user = userResult.rows[0];
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: "/",
    });

    await pool.query("COMMIT");

    return res.json({
      success: true,
    });
  } catch (err) {
    await pool.query("ROLLBACK");

    console.error(err);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

router.post(
  "/login/email",
  passport.authenticate("local", { session: false }),
  async (req, res) => {
    const user = req.user;

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
      path: "/",
    });

    const newUser = {
      id: user.id,
      email: user.email,
      name: user.name,
    };
    return res.status(200).json(newUser);
  },
);

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async function verify(email, password, cb) {
      try {
        if (
          typeof email !== "string" ||
          email.trim() === "" ||
          typeof password !== "string" ||
          password.trim() === ""
        ) {
          return cb(null, false, {
            message: "Email and password are required",
          });
        }

        const result = emailSchema.safeParse(email);
        if (!result.success) {
          return cb(null, false, { message: "Invalid email" });
        }

        const user = await pool.query("SELECT * FROM users WHERE email = $1", [
          email,
        ]);
        if (user.rowCount === 0) {
          return cb(null, false, {
            message: "Invalid username or password.",
          });
        }
        const isEqual = await bcrypt.compare(password, user.rows[0].password);

        if (!isEqual) {
          return cb(null, false, {
            message: "Incorrect username or password.",
          });
        }

        const userDetails = PublicUser.fromDbUser(user.rows[0]);

        return cb(null, userDetails);
      } catch (error) {
        return cb({ error });
      }
    },
  ),
);

router.post("/signup", async (req, res) => {
  const user = req.body;

  const userMatches = await pool.query("SELECT * FROM users WHERE email = $1", [
    user.email,
  ]);
  if (userMatches.rowCount !== 0) {
    return res.status(401).json({ failed: "User already exists!" });
  }

  const userResult = await pool.query(
    "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email",
    [user.name, user.email, await bcrypt.hash(user.password, 10)],
  );

  const newUser = userResult.rows[0];

  const token = jwt.sign(
    {
      id: newUser.id,
      email: newUser.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7,
    path: "/",
  });
  return res.status(200).json(newUser);
});

router.post("/logout", (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
    });
    res.clearCookie("token", {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
    });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error });
  }
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
