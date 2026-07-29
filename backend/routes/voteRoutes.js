const express = require("express");
const router = express.Router();

const {
    castVote,
    getMyVote,
    getVotesByPoll,
    updateVote,
    deleteVote
} = require("../controllers/voteController");

const protect = require("../middleware/authMiddleware");

// ==========================================
// VOTE ROUTES
// ==========================================

// Cast a vote
router.post("/:pollId", protect, castVote);

// Get my vote for a specific poll
router.get("/poll/:pollId/me", protect, getMyVote);

// Get all votes for a poll (Admin/Super Admin)
router.get("/poll/:pollId", protect, getVotesByPoll);

// Update my vote (if poll is still open)
router.put("/:id", protect, updateVote);

// Delete my vote (optional feature)
router.delete("/:id", protect, deleteVote);

module.exports = router;