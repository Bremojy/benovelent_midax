const express = require("express");
const router = express.Router();

const {
    castVote,
    getMyVote,
    getVotesByPoll,
    updateVote,
    deleteVote
} = require("../controllers/voteController");

const { verifyToken: protect } = require("../middleware/authMiddleware");
const verified = require("../middleware/verifiedMiddleware");
const memberStatus = require("../middleware/memberStatusMiddleware");
const profileCompleted = require("../middleware/profileCompletionMiddleware");
const { isMember, isAdminOrSuperAdmin } = require("../middleware/roleMiddleware");

// ==========================================
// VOTE ROUTES
// ==========================================

// Cast a vote
router.post("/:pollId", protect, verified, memberStatus, profileCompleted, isMember, castVote);

// Get my vote for a specific poll
router.get("/poll/:pollId/me", protect, verified, memberStatus, profileCompleted, isMember, getMyVote);

// Get all votes for a poll (Admin/Super Admin)
router.get("/poll/:pollId", protect, isAdminOrSuperAdmin, getVotesByPoll);

// Update my vote (if poll is still open)
router.put("/:id", protect, verified, memberStatus, profileCompleted, isMember, updateVote);

// Delete my vote (optional feature)
router.delete("/:id", protect, verified, memberStatus, profileCompleted, isMember, deleteVote);

module.exports = router;