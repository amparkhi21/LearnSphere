const Quiz = require("../models/quiz.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const aiService = require("../services/ai.service");
const { DEFAULT_PAGE_SIZE } = require("../constants");

// @route POST /api/v1/quizzes  (manual creation by teacher)
const createQuiz = asyncHandler(async (req, res) => {
  const quiz = await Quiz.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json(new ApiResponse(201, quiz, "Quiz created successfully"));
});

// @route POST /api/v1/quizzes/generate  (AI-generated quiz)
const generateQuiz = asyncHandler(async (req, res) => {
  const { title, subject, topic, difficulty = "medium", count = 5, course, examTags } = req.body;

  if (!subject) throw new ApiError(400, "Subject is required to generate a quiz");

  const questions = await aiService.generateQuizQuestions({ subject, topic, difficulty, count });

  const quiz = await Quiz.create({
    title: title || `${subject}${topic ? ` - ${topic}` : ""} Practice Quiz`,
    createdBy: req.user._id,
    course,
    subject,
    topic,
    examTags: examTags || [],
    difficulty,
    isAIGenerated: true,
    questions,
  });

  res.status(201).json(new ApiResponse(201, quiz, "AI-generated quiz created successfully"));
});

// @route GET /api/v1/quizzes
const getQuizzes = asyncHandler(async (req, res) => {
  const { subject, examTag, difficulty, page = 1, limit = DEFAULT_PAGE_SIZE } = req.query;

  const filter = { isPublic: true };
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

// @route GET /api/v1/quizzes/:id  (hides answers until submitted)
const getQuizById = asyncHandler(async (req, res) => {
  const quiz = await Quiz.findById(req.params.id).select("-questions.correctOptionIndex -questions.explanation");
  if (!quiz) throw new ApiError(404, "Quiz not found");
  res.status(200).json(new ApiResponse(200, quiz, "Quiz fetched"));
});

module.exports = { createQuiz, generateQuiz, getQuizzes, getQuizById };
