import { AskChatBot } from "./AI/askchatbot.js"
import GroqModel from "./AI/models/chatbotModels.js"
import express from "express";
import apiRoutes from "./API/askChatBot.js";
import utilityRoutes from "./Utility/rateLimiter.js";
import models from "./API/getAllModels.js";
import users from "./API/user.js"

const app = express();

app.use(express.json());

// mount routes
app.use("/api", utilityRoutes);
app.use("/api", apiRoutes);
app.use("/api", models);
app.use("/api", users)

app.listen(process.env.PORT, () => { 
    console.log("Server running on port: ",process.env.PORT);
});
