const express = require("express");
const router = express.Router();

const {
    createPoll,
    getPolls,
    getPoll,
    updatePoll,
    deletePoll,
    closePoll,
    reopenPoll,
    getPollResults
} = require("../controllers/pollController");

const { verifyToken: protect } = require("../middleware/authMiddleware");

// ==========================================
// POLL ROUTES
// ==========================================

// Create a new poll (Admin/Super Admin)
router.post("/", protect, createPoll);

// Get all polls
router.get("/", protect, getPolls);

// Get a single poll
router.get("/:id", protect, getPoll);

// Update a poll
router.put("/:id", protect, updatePoll);

// Delete a poll
router.delete("/:id", protect, deletePoll);

// Close a poll
router.put("/:id/close", protect, closePoll);

// Reopen a poll
router.put("/:id/reopen", protect, reopenPoll);

// Get poll results
router.get("/:id/results", protect, getPollResults);

module.exports = router;