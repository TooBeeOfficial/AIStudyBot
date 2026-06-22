import express from "express";
import { rateLimit } from "express-rate-limit";

const router = express.Router();

const limiter = rateLimit({
  max: 200,
  message: "Too many requests, please try again after 15 minutes",
});

router.use(limiter);
    
export default router;
