const express = require("express");
const { submitQuizAttempt, getMyAttempts, getAttemptById } = require("../controllers/quizAttempt.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(protect);

router.post("/", submitQuizAttempt);
router.get("/mine", getMyAttempts);
router.get("/:id", getAttemptById);

module.exports = router;
