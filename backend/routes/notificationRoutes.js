const express = require("express");
const router = express.Router();

const {
    getNotifications,
    getUnreadCount,
    getNotification,
    createNotification,
    broadcastToMembers,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearNotifications
} = require("../controllers/notificationController");

const { verifyToken: protect } = require("../middleware/authMiddleware");

// =======================================
// NOTIFICATION ROUTES
// =======================================

// Get all notifications for logged-in user
router.get("/", protect, getNotifications);

// Unread notification count
router.get("/unread-count", protect, getUnreadCount);

// Get single notification
router.get("/:id", protect, getNotification);

// Create notification (Admin/Super Admin/System)
router.post("/", protect, createNotification);
router.post("/broadcast", protect, broadcastToMembers);

// Mark one notification as read
router.put("/:id/read", protect, markAsRead);

// Mark all notifications as read
router.put("/read-all", protect, markAllAsRead);

// Delete one notification
router.delete("/clear", protect, clearNotifications);

// Delete one notification
router.delete("/:id", protect, deleteNotification);

router.delete("/", protect, clearNotifications);

module.exports = router;