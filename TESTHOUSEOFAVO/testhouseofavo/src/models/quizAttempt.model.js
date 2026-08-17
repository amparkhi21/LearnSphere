const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    answers: [
      {
        question: { type: mongoose.Schema.Types.ObjectId, required: true },
        selectedOptionIndex: { type: Number, required: true },
        isCorrect: { type: Boolean, required: true },
      },
    ],

    score: { type: Number, required: true }, // number correct
    totalQuestions: { type: Number, required: true },
    percentage: { type: Number, required: true },
    timeTakenSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
