const express = require("express");
const router = express.Router();

const {
    createContribution,
    getContributions,
    getContribution,
    updateContribution,
    deleteContribution,
    approveContribution,
    rejectContribution,
    getMemberContributions,
    getContributionSummary
} = require("../controllers/contributionController");

const protect = require("../middleware/authMiddleware");

// ==========================================
// CONTRIBUTION ROUTES
// ==========================================

// Create a contribution
router.post("/", protect, createContribution);

// Get all contributions
router.get("/", protect, getContributions);


// Get all contributions for one member
router.get("/member/:memberId", protect, getMemberContributions);

// Get one contribution
router.get("/:id", protect, getContribution);

// Update contribution
router.put("/:id", protect, updateContribution);

// Delete contribution
router.delete("/:id", protect, deleteContribution);

// Approve contribution
router.put("/:id/approve", protect, approveContribution);

// Reject contribution
router.put("/:id/reject", protect, rejectContribution);

module.exports = router;