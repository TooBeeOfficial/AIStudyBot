import express from "express";
import { rateLimit } from "express-rate-limit";

const router = express.Router();

// Set up rate limiter: maximum of 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 10 * 1000,
    max: 150,
    message: "Too many requests from this IP, please try again after 15 minutes",
});

// Apply the rate limiter to all requests
router.use(limiter);

export default router;