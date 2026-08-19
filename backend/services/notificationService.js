const Notification = require("../models/Notification");
const { getIO } = require("../sockets/socket");
const { sendPushForNotification } = require("./pushService");

const createNotification = async ({ recipient, recipientModel = "Member", sender, senderModel, title, message, type = "system", link = "", metadata = {}, referenceId, referenceModel, icon = "notifications", suppressPush = false }) => {
  try {
    if (!recipient || !title || !message) return null;
    const notification = await Notification.create({ recipient, recipientModel, sender, senderModel, title, message, type, link, metadata, referenceId, referenceModel, icon, suppressPush });
    const io = getIO();
    io?.to(`user:${String(recipient)}`).emit("new-notification", notification);
    if (!suppressPush) sendPushForNotification(notification).catch((error) => console.warn("Push notification failed:", error.message));
    return notification;
  } catch (error) {
    console.error("Notification Service Error:", error.message);
    return null;
  }
};

module.exports = { createNotification };
