const mongoose = require("mongoose");
const slugify = require("slugify");
const { COURSE_STATUS, COURSE_LEVEL } = require("../constants");

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, unique: true },
    description: { type: String, required: true },
    thumbnail: { type: String, default: "" },

    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    stream: { type: String, required: true }, // Engineering, Medical, Commerce, etc.
    subject: { type: String, required: true }, // Physics, Maths, Accounts, etc.
    examTags: [{ type: String }], // JEE, NEET, CAT, etc.

    price: { type: Number, default: 0, min: 0 },
    discountPrice: { type: Number, default: 0 },

    level: { type: String, enum: Object.values(COURSE_LEVEL), default: COURSE_LEVEL.BEGINNER },
    status: { type: String, enum: Object.values(COURSE_STATUS), default: COURSE_STATUS.DRAFT },

    modules: [
      {
        title: { type: String, required: true },
        description: { type: String },
        resources: [{ type: mongoose.Schema.Types.ObjectId, ref: "Resource" }],
        order: { type: Number, default: 0 },
      },
    ],

    tags: [{ type: String }],
    language: { type: String, default: "English" },
    duration: { type: String, default: "" }, // e.g. "6 weeks"

    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    enrollmentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

courseSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = `${slugify(this.title, { lower: true, strict: true })}-${Date.now().toString().slice(-5)}`;
  }
  next();
});

courseSchema.index({ title: "text", description: "text", subject: "text", tags: "text" });

module.exports = mongoose.model("Course", courseSchema);
