import express from "express";
import { rateLimit } from "express-rate-limit";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 1000,
  max: 150,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

router.use(limiter);

export default router;
