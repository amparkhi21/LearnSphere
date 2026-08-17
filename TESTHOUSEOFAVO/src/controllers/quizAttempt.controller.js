const Quiz = require("../models/quiz.model");
const QuizAttempt = require("../models/quizAttempt.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");

// @route POST /api/v1/quiz-attempts   body: { quizId, answers: [{questionId, selectedOptionIndex}], timeTakenSeconds }
const submitQuizAttempt = asyncHandler(async (req, res) => {
  const { quizId, answers, timeTakenSeconds } = req.body;

  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new ApiError(404, "Quiz not found");

  let score = 0;
  const gradedAnswers = answers.map(({ questionId, selectedOptionIndex }) => {
    const question = quiz.questions.id(questionId);
    const isCorrect = question ? question.correctOptionIndex === selectedOptionIndex : false;
    if (isCorrect) score += 1;
    return { question: questionId, selectedOptionIndex, isCorrect };
  });

  const percentage = Math.round((score / quiz.questions.length) * 100);

  const attempt = await QuizAttempt.create({
    quiz: quizId,
    student: req.user._id,
    answers: gradedAnswers,
    score,
    totalQuestions: quiz.questions.length,
    percentage,
    timeTakenSeconds: timeTakenSeconds || 0,
  });

  quiz.attemptCount += 1;
  await quiz.save({ validateBeforeSave: false });

  // Return attempt along with full explanations for review
  const reviewQuestions = quiz.questions.map((q) => ({
    _id: q._id,
    questionText: q.questionText,
    options: q.options,
    correctOptionIndex: q.correctOptionIndex,
    explanation: q.explanation,
  }));

  res.status(201).json(new ApiResponse(201, { attempt, reviewQuestions }, "Quiz submitted successfully"));
});

// @route GET /api/v1/quiz-attempts/mine
const getMyAttempts = asyncHandler(async (req, res) => {
  const attempts = await QuizAttempt.find({ student: req.user._id })
    .populate("quiz", "title subject difficulty")
    .sort("-createdAt");

  res.status(200).json(new ApiResponse(200, attempts, "Your quiz attempts fetched"));
});

// @route GET /api/v1/quiz-attempts/:id
const getAttemptById = asyncHandler(async (req, res) => {
  const attempt = await QuizAttempt.findById(req.params.id).populate("quiz");
  if (!attempt) throw new ApiError(404, "Attempt not found");

  if (String(attempt.student) !== String(req.user._id)) {
    throw new ApiError(403, "Not your quiz attempt");
  }

  res.status(200).json(new ApiResponse(200, attempt, "Attempt fetched"));
});

module.exports = { submitQuizAttempt, getMyAttempts, getAttemptById };
