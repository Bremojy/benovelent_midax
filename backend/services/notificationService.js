// ==========================================
// services/notificationService.js
// ==========================================

const Notification = require("../models/Notification");

// ==========================================
// CREATE NOTIFICATION
// ==========================================

const createNotification = async ({
  recipient,
  title,
  message,
  type = "system",
  link = "",
  metadata = {},
}) => {
  try {
    // If Notification model doesn't exist yet,
    // simply skip creating notifications.
    if (!Notification) return;

    await Notification.create({
      recipient,
      title,
      message,
      type,
      link,
      metadata,
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error(
      "Notification Service Error:",
      error.message
    );
  }
};

module.exports = {
  createNotification,
};