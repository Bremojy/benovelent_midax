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
    unreactToMessage,
    markAsRead,
    deleteForEveryone,
    searchConversationMessages,
    forwardMessage
} = require("../controllers/messageController");

const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isChatUser } = require("../middleware/roleMiddleware");
const profileCompleted = require("../middleware/profileCompletionMiddleware");
const { uploadSingle, setUploadType } = require("../middleware/upload");

// =======================================
// MESSAGE ROUTES
// =======================================


// Upload a chat asset
router.post("/upload", protect, isChatUser, profileCompleted, setUploadType("messages"), uploadSingle("file"), uploadMessageAsset);

// Send a message
router.post("/", protect, isChatUser, profileCompleted, sendMessage);

// Get all messages in a conversation
router.get("/conversation/:conversationId/search", protect, isChatUser, profileCompleted, searchConversationMessages);
router.get("/conversation/:conversationId", protect, isChatUser, profileCompleted, getConversationMessages);

// Get a single message
router.get("/:id", protect, isChatUser, profileCompleted, getMessage);

// Edit a message
router.put("/:id", protect, isChatUser, profileCompleted, editMessage);

// Delete a message
router.delete("/:id", protect, isChatUser, profileCompleted, deleteMessage);
router.delete("/:id/everyone", protect, isChatUser, profileCompleted, deleteForEveryone);

// React to a message
router.put("/:id/react", protect, isChatUser, profileCompleted, reactToMessage);
router.delete("/:id/react", protect, isChatUser, profileCompleted, unreactToMessage);
router.post("/:id/forward", protect, isChatUser, profileCompleted, forwardMessage);

// Mark a message as read
router.put("/:id/read", protect, isChatUser, profileCompleted, markAsRead);

module.exports = router;