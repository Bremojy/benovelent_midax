const express = require("express");

const router = express.Router();

// =======================================
// AUTHENTICATION
// =======================================

const {
  verifyToken: protect,
} = require("../middleware/authMiddleware");

// =======================================
// ROLE AUTHORIZATION
// =======================================

const {
  isAdmin,
  isAdminOrSuperAdmin,
} = require("../middleware/roleMiddleware");

// =======================================
// ADMIN CONTROLLER
// =======================================

const {
  getDashboard,
  getMembers,
  getMember,
  createMember,
  updateMember,
  suspendMember,
  activateMember,
  deleteMember,
  restoreMember,
  resetPassword,
  getRecentMembers,
  getStatistics,
  filterMembers,
  monthlyRegistrations,
  contributionSummary,
} = require("../controllers/adminController");

// =======================================
// ADMIN DASHBOARD
// =======================================

router.get(
  "/dashboard",
  protect,
  isAdmin,
  getDashboard
);

// =======================================
// MEMBER STATISTICS
// =======================================

// Main statistics endpoint
router.get(
  "/statistics",
  protect,
  isAdminOrSuperAdmin,
  getStatistics
);

// Backward-compatible statistics endpoint
router.get(
  "/members/statistics",
  protect,
  isAdminOrSuperAdmin,
  getStatistics
);

// =======================================
// RECENT MEMBERS
// =======================================

router.get(
  "/members/recent",
  protect,
  isAdminOrSuperAdmin,
  getRecentMembers
);

// =======================================
// FILTER MEMBERS
// =======================================

router.get(
  "/members/filter",
  protect,
  isAdminOrSuperAdmin,
  filterMembers
);

// =======================================
// MONTHLY REGISTRATIONS
// =======================================

router.get(
  "/members/monthly-registrations",
  protect,
  isAdminOrSuperAdmin,
  monthlyRegistrations
);

// =======================================
// CONTRIBUTION SUMMARY
// =======================================

router.get(
  "/members/contribution-summary",
  protect,
  isAdminOrSuperAdmin,
  contributionSummary
);

// =======================================
// GET ALL MEMBERS
// =======================================

router.get(
  "/members",
  protect,
  isAdminOrSuperAdmin,
  getMembers
);

// =======================================
// GET SINGLE MEMBER
// =======================================

router.get(
  "/members/:id",
  protect,
  isAdminOrSuperAdmin,
  getMember
);

// =======================================
// CREATE MEMBER
// =======================================

router.post(
  "/members",
  protect,
  isAdminOrSuperAdmin,
  createMember
);

// =======================================
// UPDATE MEMBER
// =======================================

router.put(
  "/members/:id",
  protect,
  isAdminOrSuperAdmin,
  updateMember
);

// =======================================
// SUSPEND MEMBER
// =======================================

router.patch(
  "/members/:id/suspend",
  protect,
  isAdminOrSuperAdmin,
  suspendMember
);

// =======================================
// ACTIVATE MEMBER
// =======================================

router.patch(
  "/members/:id/activate",
  protect,
  isAdminOrSuperAdmin,
  activateMember
);

// =======================================
// DELETE MEMBER
// =======================================

router.delete(
  "/members/:id",
  protect,
  isAdminOrSuperAdmin,
  deleteMember
);

// =======================================
// RESTORE MEMBER
// =======================================

router.patch(
  "/members/:id/restore",
  protect,
  isAdminOrSuperAdmin,
  restoreMember
);

// =======================================
// RESET MEMBER PASSWORD
// =======================================

router.patch(
  "/members/:id/reset-password",
  protect,
  isAdminOrSuperAdmin,
  resetPassword
);

// =======================================
// EXPORT
// =======================================

module.exports = router;
