const Notification = require("../models/notification.model");

const createNotification = async ({ recipient, sender, type, title, message, link = "" }) => {
  try {
    return await Notification.create({ recipient, sender, type, title, message, link });
  } catch (err) {
    console.warn("Failed to create notification:", err.message);
    return null;
  }
};

module.exports = { createNotification };
