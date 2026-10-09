/**
 * Quiz data guards.
 *
 * The quiz UI must only ever show REAL questions. These helpers make sure that
 * API-configuration messages, old "[Sample]" placeholder questions, error
 * objects, or half-formed data are never rendered as quiz content.
 */

// Text produced by the old buggy fallback / config messages. Deliberately specific so that
// legitimate questions (e.g. about "API keys" as a topic) are never rejected.
const PLACEHOLDER_RE =
  /\[sample\]|GEMINI_API_KEY|GROQ_API_KEY|AI provider key in \.env|for real AI-generated questions/i;

export const isPlaceholderText = (value) => typeof value === "string" && PLACEHOLDER_RE.test(value);

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;

/** A question is displayable if it has text and >= 2 real options and is not placeholder content. */
export function isValidQuestion(q) {
  if (!q || typeof q !== "object") return false;
  if (!isNonEmptyString(q.questionText) || isPlaceholderText(q.questionText)) return false;
  if (!Array.isArray(q.options) || q.options.length < 2) return false;
  if (!q.options.every((o) => isNonEmptyString(o) && !isPlaceholderText(o))) return false;
  if (q._id === undefined || q._id === null || q._id === "") return false; // needed to submit answers
  return true;
}

/** A quiz is displayable only if it has at least one question and EVERY question is valid. */
export function isValidQuiz(quiz) {
  return (
    !!quiz &&
    typeof quiz === "object" &&
    isNonEmptyString(quiz._id) &&
    Array.isArray(quiz.questions) &&
    quiz.questions.length > 0 &&
    quiz.questions.every(isValidQuestion)
  );
}

export const INVALID_QUIZ_MESSAGE =
  "The quiz data we received was incomplete or invalid, so it wasn't shown. Please try generating it again.";

/** Throws a user-friendly Error unless the quiz is valid. Returns the quiz otherwise. */
export function assertValidQuiz(quiz) {
  if (!isValidQuiz(quiz)) throw new Error(INVALID_QUIZ_MESSAGE);
  return quiz;
}

/** Keep only quizzes that are safe to list (hides leftover placeholder quizzes saved by the old bug). */
export const filterDisplayableQuizzes = (list) =>
  (Array.isArray(list) ? list : []).filter(
    (q) =>
      q &&
      isNonEmptyString(q._id) &&
      !isPlaceholderText(q.title) &&
      !(Array.isArray(q.questions) && q.questions.some((qq) => isPlaceholderText(qq?.questionText)))
  );

/** Normalise the "number of questions" input to an integer within the supported range. */
export function clampQuestionCount(value, min = 3, max = 15, fallback = 5) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
