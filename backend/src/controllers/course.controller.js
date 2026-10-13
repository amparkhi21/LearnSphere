const Course = require("../models/course.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const { DEFAULT_PAGE_SIZE, COURSE_STATUS, ROLES } = require("../constants");
const fs = require("fs/promises");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const removeTempUpload = async (file) => {
  if (!file?.path) return;
  try { await fs.unlink(file.path); } catch (error) { if (error.code !== "ENOENT") console.warn("Could not remove temporary course image", error.message); }
};

const storeCourseThumbnail = async (file) => {
  if (!file) return null;
  const supportedTypes = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  try {
    if (file.size > 5 * 1024 * 1024) throw new ApiError(400, "Course images must be 5 MB or smaller");
    const extension = supportedTypes[file.mimetype];
    if (!extension) throw new ApiError(400, "Use a JPEG, PNG, or WebP course image");
    const handle = await fs.open(file.path, "r");
    const signature = Buffer.alloc(12);
    try { await handle.read(signature, 0, signature.length, 0); } finally { await handle.close(); }
    const validSignature = extension === "jpeg"
      ? signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
      : extension === "png"
        ? signature.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : signature.toString("ascii", 0, 4) === "RIFF" && signature.toString("ascii", 8, 12) === "WEBP";
    if (!validSignature) throw new ApiError(400, "The selected file is not a valid JPEG, PNG, or WebP image");
    if (!isCloudinaryConfigured()) throw new ApiError(503, "Course image uploads require Cloudinary storage to be configured");
    const stored = await cloudinary.uploader.upload(file.path, { folder: "learning-marketplace/courses", resource_type: "image", allowed_formats: ["jpg", "jpeg", "png", "webp"] });
    return { thumbnail: stored.secure_url, thumbnailPublicId: stored.public_id || "", thumbnailResourceType: stored.resource_type || "image" };
  } finally {
    await removeTempUpload(file);
  }
};

const removeCourseThumbnailQuietly = async (course) => {
  if (!course?.thumbnailPublicId || !isCloudinaryConfigured()) return;
  try { await cloudinary.uploader.destroy(course.thumbnailPublicId, { resource_type: course.thumbnailResourceType || "image" }); }
  catch (error) { console.warn("Could not remove replaced course image", error.message); }
};

const parseCourseBody = (body) => {
  const parsed = { ...body };
  if (typeof parsed.modules === "string") {
    try { parsed.modules = JSON.parse(parsed.modules); }
    catch (_) { throw new ApiError(400, "Course modules must be valid JSON"); }
  }
  delete parsed.thumbnail;
  delete parsed.thumbnailPublicId;
  delete parsed.thumbnailResourceType;
  delete parsed.teacher;
  return parsed;
};

// @route POST /api/v1/courses (teacher)
const createCourse = asyncHandler(async (req, res) => {
  let body;
  try { body = parseCourseBody(req.body || {}); }
  catch (error) { await removeTempUpload(req.file); throw error; }
  const thumbnail = await storeCourseThumbnail(req.file);
  let course;
  try {
    course = await Course.create({ ...body, ...(thumbnail || {}), teacher: req.user._id });
  } catch (error) {
    await removeCourseThumbnailQuietly(thumbnail);
    throw error;
  }
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
  if (!course) { await removeTempUpload(req.file); throw new ApiError(404, "Course not found"); }

  if (String(course.teacher) !== String(req.user._id) && req.user.role !== ROLES.ADMIN) {
    await removeTempUpload(req.file);
    throw new ApiError(403, "You do not own this course");
  }

  let updates;
  try { updates = parseCourseBody(req.body || {}); }
  catch (error) { await removeTempUpload(req.file); throw error; }
  const oldThumbnail = { thumbnailPublicId: course.thumbnailPublicId, thumbnailResourceType: course.thumbnailResourceType };
  const thumbnail = await storeCourseThumbnail(req.file);
  Object.assign(course, updates);
  if (thumbnail) Object.assign(course, thumbnail);
  try {
    await course.save();
  } catch (error) {
    await removeCourseThumbnailQuietly(thumbnail);
    throw error;
  }
  if (thumbnail) await removeCourseThumbnailQuietly(oldThumbnail);

  res.status(200).json(new ApiResponse(200, course, "Course updated successfully"));
});

// @route DELETE /api/v1/courses/:id
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, "Course not found");

  if (String(course.teacher) !== String(req.user._id) && req.user.role !== ROLES.ADMIN) {
    throw new ApiError(403, "You do not own this course");
  }

  // Archive so existing enrollments and course history remain intact.
  course.status = COURSE_STATUS.ARCHIVED;
  await course.save();
  res.status(200).json(new ApiResponse(200, course, "Course archived successfully"));
});

// @route GET /api/v1/courses/teacher/mine (teacher dashboard)
const getMyCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ teacher: req.user._id, status: { $ne: COURSE_STATUS.ARCHIVED } }).sort("-createdAt");
  res.status(200).json(new ApiResponse(200, courses, "Your courses fetched"));
});

module.exports = { createCourse, getCourses, getCourseById, updateCourse, deleteCourse, getMyCourses };
