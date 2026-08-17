const mongoose = require("mongoose");

const studyPlanSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true },
    examTarget: { type: String, required: true }, // e.g. "JEE Main 2027"
    stream: { type: String, default: "" },
    durationWeeks: { type: Number, required: true },
    hoursPerDay: { type: Number, default: 2 },

    // AI-generated structured plan
    syllabus: [
      {
        subject: { type: String, required: true },
        topics: [{ type: String }],
      },
    ],
    weeklyPlan: [
      {
        week: { type: Number, required: true },
        focus: { type: String },
        tasks: [{ type: String }],
        resources: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resource" }],
      },
    ],

    isAIGenerated: { type: Boolean, default: true },
    rawPrompt: { type: String, default: "" },
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyPlan", studyPlanSchema);
