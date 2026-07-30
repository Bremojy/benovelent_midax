const express = require("express");
const router = express.Router();

const {
    sendMessage,
    getConversationMessages,
    getMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    markAsRead
} = require("../controllers/messageController");

const { verifyToken: protect } = require("../middleware/authMiddleware");

// =======================================
// MESSAGE ROUTES
// =======================================

// Send a message
router.post("/", protect, sendMessage);

// Get all messages in a conversation
router.get("/conversation/:conversationId", protect, getConversationMessages);

// Get a single message
router.get("/:id", protect, getMessage);

// Edit a message
router.put("/:id", protect, editMessage);

// Delete a message
router.delete("/:id", protect, deleteMessage);

// React to a message
router.put("/:id/react", protect, reactToMessage);

// Mark a message as read
router.put("/:id/read", protect, markAsRead);

module.exports = router;