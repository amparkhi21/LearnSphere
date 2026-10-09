class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = [], errorCode = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.errorCode = errorCode; // optional machine-readable code, e.g. "AI_RATE_LIMITED"
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
