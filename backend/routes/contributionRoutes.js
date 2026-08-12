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
    getContributionSummary,
    createBulkContributionRun
} = require("../controllers/contributionController");

const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isAdminOrSuperAdmin, isMember } = require("../middleware/roleMiddleware");

// ==========================================
// CONTRIBUTION ROUTES
// ==========================================

// Create a contribution
router.post("/", protect, isAdminOrSuperAdmin, createContribution);

// Get all contributions
router.get("/", protect, isAdminOrSuperAdmin, getContributions);


// Record the same monthly payroll deduction for all active members
router.post("/bulk", protect, isAdminOrSuperAdmin, createBulkContributionRun);

// Get all contributions for one member
router.get("/member/:memberId", protect, getMemberContributions);

// Get one contribution
router.get("/:id", protect, getContribution);

// Update contribution
router.put("/:id", protect, isAdminOrSuperAdmin, updateContribution);

// Delete contribution
router.delete("/:id", protect, isAdminOrSuperAdmin, deleteContribution);

// Approve contribution
router.put("/:id/approve", protect, isAdminOrSuperAdmin, approveContribution);

// Reject contribution
router.put("/:id/reject", protect, isAdminOrSuperAdmin, rejectContribution);

module.exports = router;