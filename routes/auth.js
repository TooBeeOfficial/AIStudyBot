import express from "express";
import passport from "passport";
import GoogleOidcStrategy from "passport-google-oidc";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({});

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const router = express.Router();

router.get("/router/login", (req, res) => {
  res.render("login");
});

router.get(
  "/router/login/federated/google",
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
        // 1. Check federated credentials
        const credResult = await pool.query(
          "SELECT * FROM federated_credentials WHERE provider = $1 AND subject = $2",
          [issuer, profile.id]
        );
        console.log(profile);
        let user;

        if (credResult.rows.length === 0) {
          // 2. Create new user
          const email = profile.emails?.[0]?.value;

            const userResult = await pool.query(
            "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email",
                [profile.displayName, email]
            );

          const newUser = userResult.rows[0];

          // 3. Save federated credentials
          await pool.query(
            "INSERT INTO federated_credentials (user_id, provider, subject) VALUES ($1, $2, $3)",
            [newUser.id, issuer, profile.id]
          );

          user = newUser;
        } else {
          // 4. Fetch existing user
          const userResult = await pool.query(
            "SELECT * FROM users WHERE id = $1",
            [credResult.rows[0].user_id]
          );

          user = userResult.rows[0];
        }

        return cb(null, user);
      } catch (err) {
        return cb(err);
      }
    }
  )
);

router.get(
  "/oauth2/redirect/google",
  passport.authenticate("google", {
    successRedirect: "http://localhost:4000/logged-in",
    failureRedirect: "http://localhost:4000/login-failed",
  })
);

router.post("/router/logout", (req, res, next) => {
  req.logout(function (err) {
    console.log("ERROR: ",err)
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