const LiveClass = require("../models/liveClass.model");
const Course = require("../models/course.model");
const Enrollment = require("../models/enrollment.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const liveKit = require("../services/livekit.service");

const MIN_DURATION = 15;
const MAX_DURATION = 240;
const safeLiveKitError = (error) => {
  if (error instanceof liveKit.LiveKitConfigurationError) return new ApiError(503, error.message, [], error.code);
  return new ApiError(502, "The LiveKit service could not complete this action. Please retry.");
};

const getTeacherClasses = asyncHandler(async (req, res) => {
  const classes = await LiveClass.find({ teacher: req.user._id })
    .select("-roomName")
    .populate("course", "title subject")
    .sort("startsAt");
  res.status(200).json(new ApiResponse(200, classes, "Your live classes fetched"));
});

const getStudentClasses = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id }).select("course");
  const courseIds = enrollments.map((enrollment) => enrollment.course);
  if (!courseIds.length) return res.status(200).json(new ApiResponse(200, [], "Your live classes fetched"));

  const classes = await LiveClass.find({ course: { $in: courseIds }, status: { $in: ["scheduled", "live"] } })
    .select("-roomName")
    .populate("course", "title subject")
    .populate("teacher", "name avatar")
    .sort("startsAt");
  res.status(200).json(new ApiResponse(200, classes, "Your live classes fetched"));
});

const scheduleClass = asyncHandler(async (req, res) => {
  const { title, description = "", courseId, subject = "", startsAt, durationMinutes } = req.body || {};
  if (typeof title !== "string" || !title.trim() || title.trim().length > 120) throw new ApiError(400, "Enter a class title (up to 120 characters)");
  if (typeof description !== "string" || description.length > 1000) throw new ApiError(400, "Description must be 1000 characters or fewer");
  if (typeof startsAt !== "string" || !/(Z|[+-]\d{2}:\d{2})$/i.test(startsAt)) throw new ApiError(400, "Provide the class date and time with a timezone");
  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime()) || startDate <= new Date()) throw new ApiError(400, "Class date and time must be in the future");
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration < MIN_DURATION || duration > MAX_DURATION) {
    throw new ApiError(400, `Duration must be between ${MIN_DURATION} and ${MAX_DURATION} minutes`);
  }

  const course = await Course.findOne({ _id: courseId, teacher: req.user._id });
  if (!course) throw new ApiError(403, "You can schedule a live class only for your own course");

  const liveClass = await LiveClass.create({
    title: title.trim(), description: description.trim(), course: course._id, teacher: req.user._id,
    subject: String(subject || course.subject || "").trim(), startsAt: startDate, durationMinutes: duration,
  });
  res.status(201).json(new ApiResponse(201, liveClass, "Live class scheduled"));
});

const cancelClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findOne({ _id: req.params.id, teacher: req.user._id });
  if (!liveClass) throw new ApiError(404, "Live class not found");
  if (liveClass.status !== "scheduled") throw new ApiError(409, "Only scheduled classes can be cancelled");
  liveClass.status = "cancelled";
  await liveClass.save();
  res.status(200).json(new ApiResponse(200, liveClass, "Live class cancelled"));
});

const startClass = asyncHandler(async (req, res) => {
  const roomName = `learnsphere-${req.params.id}`;
  const claimed = await LiveClass.findOneAndUpdate(
    { _id: req.params.id, teacher: req.user._id, status: "scheduled" },
    { $set: { status: "starting", roomName } },
    { new: true }
  );
  if (!claimed) {
    const existing = await LiveClass.findById(req.params.id).select("teacher status");
    if (!existing || String(existing.teacher) !== String(req.user._id)) throw new ApiError(404, "Live class not found");
    throw new ApiError(409, `This class cannot be started while its status is ${existing.status}`);
  }

  try {
    await liveKit.createRoom(roomName);
    const liveClass = await LiveClass.findOneAndUpdate(
      { _id: claimed._id, teacher: req.user._id, status: "starting" },
      { $set: { status: "live", startedAt: new Date() } },
      { new: true }
    ).select("-roomName");
    if (!liveClass) throw new ApiError(409, "Class status changed while starting. Please refresh.");
    return res.status(200).json(new ApiResponse(200, liveClass, "Live class started"));
  } catch (error) {
    try { await liveKit.deleteRoom(roomName); } catch (_) { /* room may not have been created */ }
    await LiveClass.updateOne(
      { _id: claimed._id, teacher: req.user._id, status: "starting" },
      { $set: { status: "scheduled" }, $unset: { roomName: 1 } }
    );
    if (error instanceof ApiError) throw error;
    throw safeLiveKitError(error);
  }
});

const endClass = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findOne({ _id: req.params.id, teacher: req.user._id }).select("+roomName");
  if (!liveClass) throw new ApiError(404, "Live class not found");
  if (liveClass.status !== "live") throw new ApiError(409, "Only live classes can be ended");
  liveClass.status = "completed";
  liveClass.endedAt = new Date();
  await liveClass.save();

  try {
    await liveKit.deleteRoom(liveClass.roomName);
  } catch (error) {
    throw safeLiveKitError(error); // class is completed, so no new tokens can be issued
  }
  liveClass.roomName = undefined;
  res.status(200).json(new ApiResponse(200, liveClass, "Live class ended"));
});

const getJoinToken = asyncHandler(async (req, res) => {
  const liveClass = await LiveClass.findById(req.params.id).select("+roomName title course teacher status");
  if (!liveClass) throw new ApiError(404, "Live class not found");

  let canPublish = false;
  if (req.user.role === "student") {
    const enrolled = await Enrollment.exists({ student: req.user._id, course: liveClass.course });
    if (!enrolled) throw new ApiError(403, "You must be enrolled in this course to join the class");
    canPublish = true;
  } else if (["teacher", "admin"].includes(req.user.role) && String(liveClass.teacher) === String(req.user._id)) {
    canPublish = true;
  } else {
    throw new ApiError(403, "You are not allowed to join this class");
  }
  if (liveClass.status !== "live" || !liveClass.roomName) throw new ApiError(409, "This live class is not currently accepting participants");

  try {
    const token = await liveKit.createParticipantToken({ room: liveClass.roomName, identity: String(req.user._id), name: req.user.name, canPublish });
    res.status(200).json(new ApiResponse(200, { token, serverUrl: process.env.LIVEKIT_URL, classTitle: liveClass.title }, "Class access granted"));
  } catch (error) {
    throw safeLiveKitError(error);
  }
});

module.exports = { getTeacherClasses, getStudentClasses, scheduleClass, cancelClass, startClass, endClass, getJoinToken };
