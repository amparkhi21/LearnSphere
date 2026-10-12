const mongoose = require("mongoose");
const { QUIZ_DIFFICULTY } = require("../constants");

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true },
    explanation: { type: String, default: "" },
    difficulty: { type: String, enum: Object.values(QUIZ_DIFFICULTY), default: QUIZ_DIFFICULTY.MEDIUM },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

    subject: { type: String, required: true },
    examTags: [{ type: String }],
    topic: { type: String, default: "" },

    isAIGenerated: { type: Boolean, default: false },
    difficulty: { type: String, enum: Object.values(QUIZ_DIFFICULTY), default: QUIZ_DIFFICULTY.MEDIUM },

    questions: [questionSchema],
    timeLimitMinutes: { type: Number, default: 15 },

    attemptCount: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);
