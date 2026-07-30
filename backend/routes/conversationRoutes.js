const express = require("express");
const router = express.Router();

const {
    createConversation,
    getMyConversations,
    getConversation,
    deleteConversation,
    addMember,
    removeMember
} = require("../controllers/conversationController");

const { verifyToken: protect } = require("../middleware/authMiddleware");

// =======================================
// Conversation Routes
// =======================================

// Create a new conversation
router.post("/", protect, createConversation);

// Get all conversations for logged-in member
router.get("/", protect, getMyConversations);

// Get single conversation
router.get("/:id", protect, getConversation);

// Delete conversation
router.delete("/:id", protect, deleteConversation);

// Add member to group conversation
router.put("/:id/add-member", protect, addMember);

// Remove member from group conversation
router.put("/:id/remove-member", protect, removeMember);

module.exports = router;