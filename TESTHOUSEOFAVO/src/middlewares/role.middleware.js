const ApiError = require("../utils/apiError");

// Usage: restrictTo("teacher", "admin")
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }
    next();
  };
};

module.exports = restrictTo;
