const express = require("express");
const rateLimit = require("express-rate-limit");
const { createQuiz, generateQuiz, getQuizzes, getMyGeneratedQuizzes, getQuizById } = require("../controllers/quiz.controller");
const { protect, optionalAuth } = require("../middlewares/auth.middleware");
const restrictTo = require("../middlewares/role.middleware");
const { ROLES } = require("../constants");

const router = express.Router();

// Protects the AI provider's (free-tier) quota from being burned by one user
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?._id ? String(req.user._id) : req.ip),
  message: {
    success: false,
    message: "You've generated a lot of quizzes recently. Please wait a few minutes and try again.",
    errorCode: "RATE_LIMITED",
  },
});

router.get("/", getQuizzes);
router.get("/mine", protect, getMyGeneratedQuizzes);
router.get("/:id", optionalAuth, getQuizById);
router.post("/", protect, restrictTo(ROLES.TEACHER, ROLES.ADMIN), createQuiz);
router.post("/generate", protect, generateLimiter, generateQuiz);

module.exports = router;
