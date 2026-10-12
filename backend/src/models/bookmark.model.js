const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    itemType: { type: String, enum: ["course", "resource", "post", "quiz"], required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "itemType" },
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, itemType: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model("Bookmark", bookmarkSchema);
