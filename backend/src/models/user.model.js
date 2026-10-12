const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../constants");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: [true, "Password is required"], minlength: 6, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 300 },

    // Student-specific
    stream: { type: String, default: "" }, // e.g. "Engineering", "Medical", "Commerce"
    examTarget: { type: String, default: "" }, // e.g. "JEE", "NEET", "UPSC"
    interests: [{ type: String }],

    // Teacher-specific
    expertise: [{ type: String }],
    isVerifiedTeacher: { type: Boolean, default: false },
    earnings: { type: Number, default: 0 },

    isBanned: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
