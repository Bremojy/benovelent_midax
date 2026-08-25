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
const { isChatUser } = require("../middleware/roleMiddleware");

const safeHandler = (handler, label) => {
    if (typeof handler === "function") return handler;
    return async (_req, res) => {
        return res.status(500).json({
            success: false,
            message: `${label} is temporarily unavailable.`
        });
    };
};

router.post("/", protect, isChatUser, safeHandler(createConversation, "Conversation creation"));
router.get("/", protect, isChatUser, safeHandler(getMyConversations, "Conversation loading"));
router.get("/:id", protect, isChatUser, safeHandler(getConversation, "Conversation loading"));
router.put("/:id/read", protect, isChatUser, safeHandler(markConversationRead, "Conversation read status"));
router.delete("/:id", protect, isChatUser, safeHandler(deleteConversation, "Conversation removal"));
router.put("/:id/add-member", protect, isChatUser, safeHandler(addMember, "Add member"));
router.put("/:id/remove-member", protect, isChatUser, safeHandler(removeMember, "Remove member"));

module.exports = router;
