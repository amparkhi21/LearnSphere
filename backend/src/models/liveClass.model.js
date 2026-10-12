const mongoose = require("mongoose");

const liveClassSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 1000 },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, default: "", trim: true, maxlength: 120 },
    startsAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 240 },
    status: { type: String, enum: ["scheduled", "starting", "live", "completed", "cancelled"], default: "scheduled", index: true },
    roomName: { type: String, default: "", select: false },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

liveClassSchema.index({ course: 1, status: 1, startsAt: 1 });
liveClassSchema.index({ teacher: 1, startsAt: -1 });

module.exports = mongoose.model("LiveClass", liveClassSchema);
