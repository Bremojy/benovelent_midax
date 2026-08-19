const express = require("express");
const router = express.Router();

const conversationController = require("../controllers/conversationController");

const {
    createConversation,
    getMyConversations,
    getConversation,
    deleteConversation,
    addMember,
    removeMember,
    markConversationRead
} = conversationController;

const { verifyToken: protect } = require("../middleware/authMiddleware");

const safeHandler = (handler, label) => {
    if (typeof handler === "function") return handler;
    return async (_req, res) => {
        return res.status(500).json({
            success: false,
            message: `${label} is temporarily unavailable.`
        });
    };
};

router.post("/", protect, safeHandler(createConversation, "Conversation creation"));
router.get("/", protect, safeHandler(getMyConversations, "Conversation loading"));
router.get("/:id", protect, safeHandler(getConversation, "Conversation loading"));
router.put("/:id/read", protect, safeHandler(markConversationRead, "Conversation read status"));
router.delete("/:id", protect, safeHandler(deleteConversation, "Conversation removal"));
router.put("/:id/add-member", protect, safeHandler(addMember, "Add member"));
router.put("/:id/remove-member", protect, safeHandler(removeMember, "Remove member"));

module.exports = router;
