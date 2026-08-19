const express = require("express");
const router = express.Router();

const {
    sendMessage,
    uploadMessageAsset,
    getConversationMessages,
    getMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    markAsRead,
    deleteForEveryone
} = require("../controllers/messageController");

const { verifyToken: protect } = require("../middleware/authMiddleware");
const { uploadSingle, setUploadType } = require("../middleware/upload");

// =======================================
// MESSAGE ROUTES
// =======================================


// Upload a chat asset
router.post("/upload", protect, setUploadType("messages"), uploadSingle("file"), uploadMessageAsset);

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
router.delete("/:id/everyone", protect, deleteForEveryone);

// React to a message
router.put("/:id/react", protect, reactToMessage);

// Mark a message as read
router.put("/:id/read", protect, markAsRead);

module.exports = router;