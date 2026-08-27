const Notification = require("../models/Notification");

const createNotification = async ({
  recipient,
  recipientModel = "Member",
  sender,
  senderModel,
  title,
  message,
  type = "system",
  link = "",
  metadata = {},
  referenceId,
  referenceModel,
  icon = "notifications",
  suppressPush = false,
}) => {
  try {
    if (!recipient || !title || !message) return null;

    const notification = await Notification.create({
      recipient,
      recipientModel,
      sender,
      senderModel,
      title,
      message,
      type,
      link,
      metadata,
      referenceId,
      referenceModel,
      icon,
      suppressPush,
    });

    // Realtime Socket.IO fanout, browser push, unread counts and cache invalidation
    // are centralized in the Notification model hooks so every notification path
    // (create/save/insertMany) gets exactly one delivery.
    try {
      const redisCache = require("./redisCache");
      await redisCache.invalidatePrefix(`notifications:${recipient}`);
    } catch (_) {}

    return notification;
  } catch (error) {
    console.error("Notification Service Error:", error.message);
    return null;
  }
};

module.exports = { createNotification };
