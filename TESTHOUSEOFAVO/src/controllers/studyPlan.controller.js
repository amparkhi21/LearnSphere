const StudyPlan = require("../models/studyPlan.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const aiService = require("../services/ai.service");

// @route POST /api/v1/study-plans/generate
const generateStudyPlan = asyncHandler(async (req, res) => {
  const { examTarget, stream, subjects, durationWeeks = 8, hoursPerDay = 2 } = req.body;

  if (!examTarget || !subjects?.length) {
    throw new ApiError(400, "examTarget and at least one subject are required");
  }

  const { syllabus, weeklyPlan } = await aiService.generateStudyPlan({
    examTarget,
    stream,
    subjects,
    durationWeeks,
    hoursPerDay,
  });

  const studyPlan = await StudyPlan.create({
    student: req.user._id,
    title: `${examTarget} - ${durationWeeks} Week Plan`,
    examTarget,
    stream,
    durationWeeks,
    hoursPerDay,
    syllabus,
    weeklyPlan,
    isAIGenerated: true,
    rawPrompt: `${examTarget} | ${stream} | ${subjects.join(", ")}`,
  });

  res.status(201).json(new ApiResponse(201, studyPlan, "AI study plan generated successfully"));
});

// @route GET /api/v1/study-plans/mine
const getMyStudyPlans = asyncHandler(async (req, res) => {
  const plans = await StudyPlan.find({ student: req.user._id }).sort("-createdAt");
  res.status(200).json(new ApiResponse(200, plans, "Your study plans fetched"));
});

// @route GET /api/v1/study-plans/:id
const getStudyPlanById = asyncHandler(async (req, res) => {
  const plan = await StudyPlan.findById(req.params.id);
  if (!plan) throw new ApiError(404, "Study plan not found");
  if (String(plan.student) !== String(req.user._id)) throw new ApiError(403, "Not your study plan");
  res.status(200).json(new ApiResponse(200, plan, "Study plan fetched"));
});

// @route PATCH /api/v1/study-plans/:id/progress
const updateStudyPlanProgress = asyncHandler(async (req, res) => {
  const { progress } = req.body;
  const plan = await StudyPlan.findById(req.params.id);
  if (!plan) throw new ApiError(404, "Study plan not found");
  if (String(plan.student) !== String(req.user._id)) throw new ApiError(403, "Not your study plan");

  plan.progress = progress;
  await plan.save();

  res.status(200).json(new ApiResponse(200, plan, "Progress updated"));
});

// @route DELETE /api/v1/study-plans/:id
const deleteStudyPlan = asyncHandler(async (req, res) => {
  const plan = await StudyPlan.findById(req.params.id);
  if (!plan) throw new ApiError(404, "Study plan not found");
  if (String(plan.student) !== String(req.user._id)) throw new ApiError(403, "Not your study plan");

  await plan.deleteOne();
  res.status(200).json(new ApiResponse(200, null, "Study plan deleted"));
});

module.exports = { generateStudyPlan, getMyStudyPlans, getStudyPlanById, updateStudyPlanProgress, deleteStudyPlan };
