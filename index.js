import GroqModel from "./models/chatbotModels.js"
import passport from "passport";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express"
import expressSession from "express-session"
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";

import apiRoutes from "./routes/askChatBot.js";
import utilityRoutes from "./Utility/rateLimiter.js";
import models from "./routes/getAllModels.js";
import users from "./routes/user.js"
import auth from "./routes/auth.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const PgStore = connectPgSimple(expressSession);

app.use(express.static(path.join(__dirname, 'public')));
app.use(expressSession({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new PgStore({ pool }),
}));

app.use(passport.initialize());
app.use(passport.session());

// mount routes
app.use("/api", utilityRoutes);
app.use("/api", apiRoutes);
app.use("/api", models);
app.use("/api", users);
app.use("/api", auth);
app.listen(process.env.PORT, () => { 
    console.log("Server running on port: ",process.env.PORT);
});
