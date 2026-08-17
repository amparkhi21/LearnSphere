const express = require("express");
const { createQuiz, generateQuiz, getQuizzes, getQuizById } = require("../controllers/quiz.controller");
const { protect } = require("../middlewares/auth.middleware");
const restrictTo = require("../middlewares/role.middleware");
const { ROLES } = require("../constants");

const router = express.Router();

router.get("/", getQuizzes);
router.get("/:id", getQuizById);
router.post("/", protect, restrictTo(ROLES.TEACHER, ROLES.ADMIN), createQuiz);
router.post("/generate", protect, generateQuiz);

module.exports = router;
