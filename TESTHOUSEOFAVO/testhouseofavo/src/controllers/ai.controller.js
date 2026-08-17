const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const aiService = require("../services/ai.service");

// @route POST /api/v1/ai/recommend-resources
const recommendResources = asyncHandler(async (req, res) => {
  const { subject, examTarget, recentTopics } = req.body;
  if (!subject || !examTarget) throw new ApiError(400, "subject and examTarget are required");

  const suggestions = await aiService.recommendResources({ subject, examTarget, recentTopics });
  res.status(200).json(new ApiResponse(200, { suggestions }, "Resource recommendations generated"));
});

// @route POST /api/v1/ai/course-outline
const generateCourseOutline = asyncHandler(async (req, res) => {
  const { title, subject, level } = req.body;
  if (!title || !subject) throw new ApiError(400, "title and subject are required");

  const modules = await aiService.generateCourseOutline({ title, subject, level: level || "beginner" });
  res.status(200).json(new ApiResponse(200, { modules }, "Course outline generated"));
});

// @route POST /api/v1/ai/doubt-assist
const doubtAssist = asyncHandler(async (req, res) => {
  const { question, subject } = req.body;
  if (!question) throw new ApiError(400, "question is required");

  const answer = await aiService.assistDoubt({ question, subject });
  res.status(200).json(new ApiResponse(200, { answer }, "AI doubt assistance generated"));
});

// @route GET /api/v1/ai/status
const getAIStatus = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, { configured: aiService.isAIConfigured() }, "AI status fetched"));
});

module.exports = { recommendResources, generateCourseOutline, doubtAssist, getAIStatus };
