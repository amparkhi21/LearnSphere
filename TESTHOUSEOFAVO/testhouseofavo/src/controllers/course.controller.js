const Course = require("../models/course.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const { DEFAULT_PAGE_SIZE, COURSE_STATUS, ROLES } = require("../constants");

// @route POST /api/v1/courses (teacher)
const createCourse = asyncHandler(async (req, res) => {
  const course = await Course.create({ ...req.body, teacher: req.user._id });
  res.status(201).json(new ApiResponse(201, course, "Course created successfully"));
});

// @route GET /api/v1/courses (public, with search/filter/pagination)
const getCourses = asyncHandler(async (req, res) => {
  const { q, stream, subject, examTag, level, minPrice, maxPrice, page = 1, limit = DEFAULT_PAGE_SIZE, sort = "-createdAt" } = req.query;

  const filter = { status: COURSE_STATUS.PUBLISHED };
  if (q) filter.$text = { $search: q };
  if (stream) filter.stream = stream;
  if (subject) filter.subject = subject;
  if (examTag) filter.examTags = examTag;
  if (level) filter.level = level;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const courses = await Course.find(filter)
    .populate("teacher", "name avatar isVerifiedTeacher")
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await Course.countDocuments(filter);

  res.status(200).json(new ApiResponse(200, { courses, total, page: Number(page), pages: Math.ceil(total / limit) }, "Courses fetched"));
});

// @route GET /api/v1/courses/:idOrSlug
const getCourseById = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };

  const course = await Course.findOne(query)
    .populate("teacher", "name avatar bio expertise isVerifiedTeacher")
    .populate({ path: "modules.resources", select: "title type fileUrl linkUrl" });

  if (!course) throw new ApiError(404, "Course not found");

  res.status(200).json(new ApiResponse(200, course, "Course fetched"));
});

// @route PATCH /api/v1/courses/:id (teacher who owns it, or admin)
const updateCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, "Course not found");

  if (String(course.teacher) !== String(req.user._id) && req.user.role !== ROLES.ADMIN) {
    throw new ApiError(403, "You do not own this course");
  }

  Object.assign(course, req.body);
  await course.save();

  res.status(200).json(new ApiResponse(200, course, "Course updated successfully"));
});

// @route DELETE /api/v1/courses/:id
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, "Course not found");

  if (String(course.teacher) !== String(req.user._id) && req.user.role !== ROLES.ADMIN) {
    throw new ApiError(403, "You do not own this course");
  }

  await course.deleteOne();
  res.status(200).json(new ApiResponse(200, null, "Course deleted successfully"));
});

// @route GET /api/v1/courses/teacher/mine (teacher dashboard)
const getMyCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ teacher: req.user._id }).sort("-createdAt");
  res.status(200).json(new ApiResponse(200, courses, "Your courses fetched"));
});

module.exports = { createCourse, getCourses, getCourseById, updateCourse, deleteCourse, getMyCourses };
