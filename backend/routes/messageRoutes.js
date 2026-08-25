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
const { isChatUser } = require("../middleware/roleMiddleware");
const { uploadSingle, setUploadType } = require("../middleware/upload");

// =======================================
// MESSAGE ROUTES
// =======================================


// Upload a chat asset
router.post("/upload", protect, isChatUser, setUploadType("messages"), uploadSingle("file"), uploadMessageAsset);

// Send a message
router.post("/", protect, isChatUser, sendMessage);

// Get all messages in a conversation
router.get("/conversation/:conversationId", protect, isChatUser, getConversationMessages);

// Get a single message
router.get("/:id", protect, isChatUser, getMessage);

// Edit a message
router.put("/:id", protect, isChatUser, editMessage);

// Delete a message
router.delete("/:id", protect, isChatUser, deleteMessage);
router.delete("/:id/everyone", protect, isChatUser, deleteForEveryone);

// React to a message
router.put("/:id/react", protect, isChatUser, reactToMessage);

// Mark a message as read
router.put("/:id/read", protect, isChatUser, markAsRead);

module.exports = router;