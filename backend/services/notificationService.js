const Notification = require("../models/Notification");

const createNotification = async ({ recipient, recipientModel = "Member", sender, senderModel, title, message, type = "system", link = "", metadata = {}, referenceId, referenceModel, icon = "notifications", suppressPush = false }) => {
  try {
    if (!recipient || !title || !message) return null;
    return await Notification.create({ recipient, recipientModel, sender, senderModel, title, message, type, link, metadata, referenceId, referenceModel, icon, suppressPush });
  } catch (error) {
    console.error("Notification Service Error:", error.message);
    return null;
  }
};

module.exports = { createNotification };
