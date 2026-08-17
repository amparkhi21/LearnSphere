const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const User = require("../models/user.model");

// Verifies JWT from Authorization header (Bearer token) or cookie
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    throw new ApiError(401, "Not authorized, no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      throw new ApiError(401, "User belonging to this token no longer exists");
    }

    if (user.isBanned) {
      throw new ApiError(403, "Your account has been suspended");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, "Not authorized, token failed or expired");
  }
});

// Optional auth - attaches user if token present, but does not block request
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
    } catch (error) {
      req.user = null;
    }
  }
  next();
});

module.exports = { protect, optionalAuth };
