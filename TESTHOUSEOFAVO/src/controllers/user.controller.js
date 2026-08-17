const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");

// @route GET /api/v1/users/:id
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  res.status(200).json(new ApiResponse(200, user.toSafeObject(), "User profile fetched"));
});

// @route PATCH /api/v1/users/me
const updateMyProfile = asyncHandler(async (req, res) => {
  const allowedFields = ["name", "bio", "avatar", "stream", "examTarget", "interests", "expertise"];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json(new ApiResponse(200, user.toSafeObject(), "Profile updated successfully"));
});

// @route GET /api/v1/users (admin only)
const listUsers = asyncHandler(async (req, res) => {
  const { role, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;

  const users = await User.find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort("-createdAt");

  const total = await User.countDocuments(filter);

  res.status(200).json(new ApiResponse(200, { users, total, page: Number(page) }, "Users fetched"));
});

// @route PATCH /api/v1/users/:id/ban (admin only)
const toggleBanUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "User not found");

  user.isBanned = !user.isBanned;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, user.toSafeObject(), `User ${user.isBanned ? "banned" : "unbanned"}`));
});

module.exports = { getUserProfile, updateMyProfile, listUsers, toggleBanUser };
