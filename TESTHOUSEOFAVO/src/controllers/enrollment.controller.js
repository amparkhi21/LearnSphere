const Enrollment = require("../models/enrollment.model");
const Course = require("../models/course.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const { sendEnrollmentEmail } = require("../services/email.service");
const { createNotification } = require("../services/notification.service");

// @route POST /api/v1/enrollments  (used after successful payment, or directly for free courses)
const enrollInCourse = asyncHandler(async (req, res) => {
  const { courseId, paymentId } = req.body;

  const course = await Course.findById(courseId);
  if (!course) throw new ApiError(404, "Course not found");

  const existing = await Enrollment.findOne({ student: req.user._id, course: courseId });
  if (existing) throw new ApiError(409, "You are already enrolled in this course");

  if (course.price > 0 && !paymentId) {
    throw new ApiError(402, "Payment required to enroll in this course");
  }

  const enrollment = await Enrollment.create({
    student: req.user._id,
    course: courseId,
    payment: paymentId || undefined,
  });

  course.enrollmentCount += 1;
  await course.save({ validateBeforeSave: false });

  sendEnrollmentEmail(req.user, course).catch(() => {});
  createNotification({
    recipient: course.teacher,
    sender: req.user._id,
    type: "enrollment",
    title: "New enrollment",
    message: `${req.user.name} enrolled in "${course.title}"`,
    link: `/courses/${course.slug}`,
  }).catch(() => {});

  res.status(201).json(new ApiResponse(201, enrollment, "Enrolled successfully"));
});

// @route GET /api/v1/enrollments/mine (student dashboard)
const getMyEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate({ path: "course", populate: { path: "teacher", select: "name avatar" } })
    .sort("-createdAt");

  res.status(200).json(new ApiResponse(200, enrollments, "Your enrollments fetched"));
});

// @route PATCH /api/v1/enrollments/:id/progress
const updateProgress = asyncHandler(async (req, res) => {
  const { progress, completedModuleId } = req.body;

  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) throw new ApiError(404, "Enrollment not found");
  if (String(enrollment.student) !== String(req.user._id)) {
    throw new ApiError(403, "Not your enrollment");
  }

  if (progress !== undefined) enrollment.progress = progress;
  if (completedModuleId && !enrollment.completedModules.includes(completedModuleId)) {
    enrollment.completedModules.push(completedModuleId);
  }
  enrollment.lastAccessedAt = new Date();
  if (enrollment.progress >= 100) enrollment.completedAt = new Date();

  await enrollment.save();
  res.status(200).json(new ApiResponse(200, enrollment, "Progress updated"));
});

// @route POST /api/v1/enrollments/:id/review
const addReview = asyncHandler(async (req, res) => {
  const { rating, review } = req.body;
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) throw new ApiError(404, "Enrollment not found");
  if (String(enrollment.student) !== String(req.user._id)) {
    throw new ApiError(403, "Not your enrollment");
  }

  enrollment.rating = rating;
  enrollment.review = review;
  await enrollment.save();

  // Recalculate course rating average
  const course = await Course.findById(enrollment.course);
  const allRatings = await Enrollment.find({ course: course._id, rating: { $exists: true } }).select("rating");
  const avg = allRatings.reduce((sum, e) => sum + e.rating, 0) / allRatings.length;
  course.ratingAverage = Math.round(avg * 10) / 10;
  course.ratingCount = allRatings.length;
  await course.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, enrollment, "Review submitted"));
});

module.exports = { enrollInCourse, getMyEnrollments, updateProgress, addReview };
