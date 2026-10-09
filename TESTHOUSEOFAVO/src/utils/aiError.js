const ApiError = require("./apiError");

/**
 * Error raised by the AI service layer.
 *
 * - `message` is ALWAYS safe to show to end users (never contains keys, URLs,
 *   or raw provider responses).
 * - `errorCode` is a stable machine-readable code the frontend can rely on.
 * - `retryable` tells the service whether an automatic second attempt makes sense.
 */
class AiServiceError extends ApiError {
  constructor(statusCode, errorCode, message, { retryable = false } = {}) {
    super(statusCode, message, [], errorCode);
    this.name = "AiServiceError";
    this.retryable = retryable;
  }
}

module.exports = AiServiceError;
