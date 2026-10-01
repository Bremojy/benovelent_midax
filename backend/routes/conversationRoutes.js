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
    markConversationRead,
    pinConversation,
    muteConversation,
    archiveConversation
} = conversationController;

const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isChatUser } = require("../middleware/roleMiddleware");
const profileCompleted = require("../middleware/profileCompletionMiddleware");

const safeHandler = (handler, label) => {
    if (typeof handler === "function") return handler;
    return async (_req, res) => {
        return res.status(500).json({
            success: false,
            message: `${label} is temporarily unavailable.`
        });
    };
};

router.post("/", protect, isChatUser, profileCompleted, safeHandler(createConversation, "Conversation creation"));
router.get("/", protect, isChatUser, profileCompleted, safeHandler(getMyConversations, "Conversation loading"));
router.get("/:id", protect, isChatUser, profileCompleted, safeHandler(getConversation, "Conversation loading"));
router.put("/:id/read", protect, isChatUser, profileCompleted, safeHandler(markConversationRead, "Conversation read status"));
router.delete("/:id", protect, isChatUser, profileCompleted, safeHandler(deleteConversation, "Conversation removal"));
router.put("/:id/pin", protect, isChatUser, profileCompleted, safeHandler(pinConversation, "Conversation pinning"));
router.put("/:id/mute", protect, isChatUser, profileCompleted, safeHandler(muteConversation, "Conversation muting"));
router.put("/:id/archive", protect, isChatUser, profileCompleted, safeHandler(archiveConversation, "Conversation archiving"));
router.put("/:id/add-member", protect, isChatUser, profileCompleted, safeHandler(addMember, "Add member"));
router.put("/:id/remove-member", protect, isChatUser, profileCompleted, safeHandler(removeMember, "Remove member"));

module.exports = router;
