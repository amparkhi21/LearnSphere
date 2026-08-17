const mongoose = require("mongoose");
const { RESOURCE_TYPE } = require("../constants");

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: { type: String, enum: Object.values(RESOURCE_TYPE), required: true },

    fileUrl: { type: String, default: "" },
    fileSize: { type: Number, default: 0 }, // in KB
    linkUrl: { type: String, default: "" },

    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" }, // optional link to a course

    stream: { type: String, default: "" },
    subject: { type: String, default: "" },
    examTags: [{ type: String }],
    tags: [{ type: String }],

    downloadCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

resourceSchema.index({ title: "text", subject: "text", tags: "text" });

module.exports = mongoose.model("Resource", resourceSchema);
