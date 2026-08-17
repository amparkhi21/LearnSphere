const mongoose = require("mongoose");

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedModules: [{ type: mongoose.Schema.Types.ObjectId }],
    lastAccessedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },

    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model("Enrollment", enrollmentSchema);
