const Notification = require("../models/notification.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");

// @route GET /api/v1/notifications
const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate("sender", "name avatar")
    .sort("-createdAt")
    .limit(50);

  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

  res.status(200).json(new ApiResponse(200, { notifications, unreadCount }, "Notifications fetched"));
});

// @route PATCH /api/v1/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) throw new ApiError(404, "Notification not found");
  if (String(notification.recipient) !== String(req.user._id)) throw new ApiError(403, "Not your notification");

  notification.isRead = true;
  await notification.save();

  res.status(200).json(new ApiResponse(200, notification, "Marked as read"));
});

// @route PATCH /api/v1/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
  res.status(200).json(new ApiResponse(200, null, "All notifications marked as read"));
});

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
