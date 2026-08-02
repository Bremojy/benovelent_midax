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
    getPollResults,
    getPublicPolls
} = require("../controllers/pollController");

const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isAdminOrSuperAdmin, isMember } = require("../middleware/roleMiddleware");

// ==========================================
// POLL ROUTES
// ==========================================

// Create a new poll (Admin/Super Admin)
router.post("/", protect, isAdminOrSuperAdmin, createPoll);

// Public active polls
router.get("/public", getPublicPolls);

// Get all polls
router.get("/", protect, getPolls);

// Get a single poll
router.get("/:id", protect, getPoll);

// Update a poll
router.put("/:id", protect, isAdminOrSuperAdmin, updatePoll);

// Delete a poll
router.delete("/:id", protect, isAdminOrSuperAdmin, deletePoll);

// Close a poll
router.put("/:id/close", protect, isAdminOrSuperAdmin, closePoll);

// Reopen a poll
router.put("/:id/reopen", protect, isAdminOrSuperAdmin, reopenPoll);

// Get poll results
router.get("/:id/results", protect, isAdminOrSuperAdmin, getPollResults);

module.exports = router;