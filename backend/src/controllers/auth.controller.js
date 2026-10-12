const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const generateToken = require("../utils/generateToken");
const { sendWelcomeEmail } = require("../services/email.service");
const { ROLES } = require("../constants");

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: (Number(process.env.JWT_COOKIE_EXPIRES_DAYS) || 7) * 24 * 60 * 60 * 1000,
});

// @route POST /api/v1/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, stream, examTarget } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    role: Object.values(ROLES).includes(role) ? role : ROLES.STUDENT,
    stream,
    examTarget,
  });

  sendWelcomeEmail(user).catch(() => {});

  const token = generateToken(user._id, user.role);
  res.cookie("token", token, cookieOptions());

  res.status(201).json(new ApiResponse(201, { user: user.toSafeObject(), token }, "Registration successful"));
});

// @route POST /api/v1/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.isBanned) {
    throw new ApiError(403, "Your account has been suspended");
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user._id, user.role);
  res.cookie("token", token, cookieOptions());

  res.status(200).json(new ApiResponse(200, { user: user.toSafeObject(), token }, "Login successful"));
});

// @route POST /api/v1/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});

// @route GET /api/v1/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user, "Current user fetched"));
});

module.exports = { register, login, logout, getMe };
