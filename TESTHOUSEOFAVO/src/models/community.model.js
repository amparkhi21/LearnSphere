const mongoose = require("mongoose");
const slugify = require("slugify");

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, default: "" },
    coverImage: { type: String, default: "" },

    subject: { type: String, required: true }, // e.g. "Physics"
    examTags: [{ type: String }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    memberCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

communitySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = `${slugify(this.name, { lower: true, strict: true })}`;
  }
  next();
});

module.exports = mongoose.model("Community", communitySchema);
