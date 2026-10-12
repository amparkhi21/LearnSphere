const Quiz = require("../models/quiz.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const aiService = require("../services/ai.service");
const { DEFAULT_PAGE_SIZE, QUIZ_DIFFICULTY } = require("../constants");

const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 15;

// @route POST /api/v1/quizzes  (manual creation by teacher)
const createQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(new ApiResponse(201, quiz, "Quiz created successfully"));
});

// @route POST /api/v1/quizzes/generate  (AI-generated quiz)
// Body: { subject, topic?, difficulty?, count?, title?, course?, examTags? }
// The quiz is only saved AFTER the AI returned valid questions. On any AI failure
// this responds with a safe { success:false, message, errorCode } and saves nothing.
const generateQuiz = asyncHandler(async (req, res) => {
  const body = req.body || {};

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (!subject) throw new ApiError(400, "Subject is required to generate a quiz");
  if (subject.length > 100) throw new ApiError(400, "Subject must be 100 characters or fewer");
  if (topic.length > 150) throw new ApiError(400, "Topic must be 150 characters or fewer");

  const difficulty = body.difficulty === undefined || body.difficulty === "" ? QUIZ_DIFFICULTY.MEDIUM : body.difficulty;
  if (!Object.values(QUIZ_DIFFICULTY).includes(difficulty)) {
    throw new ApiError(400, `Difficulty must be one of: ${Object.values(QUIZ_DIFFICULTY).join(", ")}`);
  }

  const count = body.count === undefined || body.count === "" || body.count === null ? 5 : Number(body.count);
  if (!Number.isInteger(count) || count < MIN_QUESTIONS || count > MAX_QUESTIONS) {
    throw new ApiError(400, `Number of questions must be a whole number between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}`);
  }

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, 150) : undefined;
  const examTags = Array.isArray(body.examTags) ? body.examTags.filter((t) => typeof t === "string").slice(0, 10) : [];

  // Throws an AiServiceError (safe message + errorCode) if generation fails; never returns sample questions.
  const questions = await aiService.generateQuizQuestions({ subject, topic, difficulty, count });

  const quiz = await Quiz.create({
    title: title || `${subject}${topic ? ` - ${topic}` : ""} Practice Quiz`,
    createdBy: req.user._id,
    course: body.course,
    subject,
    topic,
    examTags,
    difficulty,
    isAIGenerated: true,
    questions,
    isPublic: false,
  });

  res.status(201).json(new ApiResponse(201, quiz, "AI-generated quiz created successfully"));
});

// @route GET /api/v1/quizzes
const getQuizzes = asyncHandler(async (req, res) => {
  const { subject, examTag, difficulty, page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;

  // Keep generated quizzes private, including legacy rows marked public by the old generator.
  const filter = { isPublic: true, isAIGenerated: { $ne: true } };
  if (subject) filter.subject = subject;
  if (examTag) filter.examTags = examTag;
  if (difficulty) filter.difficulty = difficulty;

  const quizzes = await Quiz.find(filter)
    .select("-questions.correctOptionIndex -questions.explanation")
    .populate("createdBy", "name avatar")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Quiz.countDocuments(filter);

  res.status(200).json(new ApiResponse(200, { quizzes, total, page: Number(page) }, "Quizzes fetched"));
});

// @route GET /api/v1/quizzes/mine
const getMyGeneratedQuizzes = asyncHandler(async (req, res) => {
  const { page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;
  const filter = { createdBy: req.user._id, isAIGenerated: true };
  const quizzes = await Quiz.find(filter)
    .select("-questions.correctOptionIndex -questions.explanation")
    .sort("-createdAt")
    .skip((page - 1) * limit)
    .limit(Number(limit));
  const total = await Quiz.countDocuments(filter);
  res.status(200).json(new ApiResponse(200, { quizzes, total, page: Number(page) }, "Your generated quizzes fetched"));
});

// @route GET /api/v1/quizzes/:id  (hides answers until submitted)
const getQuizById = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).select("-questions.correctOptionIndex -questions.explanation");
  if (!quiz) throw new ApiError(404, "Quiz not found");
  if ((!quiz.isPublic || quiz.isAIGenerated) && (!req.user || String(quiz.createdBy) !== String(req.user._id))) {
    throw new ApiError(req.user ? 403 : 401, "You do not have access to this quiz");
  }
  res.status(200).json(new ApiResponse(200, quiz, "Quiz fetched"));
});

module.exports = { createQuiz, generateQuiz, getQuizzes, getMyGeneratedQuizzes, getQuizById };
