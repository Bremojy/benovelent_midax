const Notification = require("../models/Notification");

module.exports = (io, socket) => {
  socket.on("notification-register", () => {
    if (socket.user?._id) socket.join(`user:${String(socket.user._id)}`);
  });

  // Notification creation and broadcasts are intentionally HTTP/server owned.
  // A browser client must never be able to forge sender/recipient metadata.

  socket.on("notification-read", async (notificationId) => {
    try {
      if (!notificationId || !socket.user?._id) return;
      const notification = await Notification.findOne({ _id: notificationId, recipient: socket.user._id });
      if (!notification) return;
      notification.read = true;
      notification.readAt = new Date();
      await notification.save();
      io.to(`user:${String(socket.user._id)}`).emit("notification-updated", notification);
    } catch (error) { console.warn("Notification read update failed:", error.message); }
  });

  socket.on("read-all-notifications", async () => {
    try {
      if (!socket.user?._id) return;
      await Notification.updateMany({ recipient: socket.user._id, read: false }, { $set: { read: true, readAt: new Date() } });
      io.to(`user:${String(socket.user._id)}`).emit("notifications-cleared");
      socket.emit("notification-count", 0);
    } catch (error) { console.warn("Read-all notification update failed:", error.message); }
  });

  socket.on("get-notification-count", async () => {
    try {
      if (!socket.user?._id) return;
      const count = await Notification.countDocuments({ recipient: socket.user._id, read: false });
      socket.emit("notification-count", count);
    } catch (error) { console.warn("Notification count failed:", error.message); }
  });

  socket.on("delete-notification", async (notificationId) => {
    try {
      if (!notificationId || !socket.user?._id) return;
      const notification = await Notification.findOneAndDelete({ _id: notificationId, recipient: socket.user._id });
      if (!notification) return;
      io.to(`user:${String(socket.user._id)}`).emit("notification-deleted", notificationId);
    } catch (error) { console.warn("Notification delete failed:", error.message); }
  });
};
