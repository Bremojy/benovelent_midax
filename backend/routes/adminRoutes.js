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
// MEMBER MANAGEMENT
// ADMIN + SUPERADMIN
// =======================================

// Get all members
router.get(
"/members",
protect,
isAdminOrSuperAdmin,
getMembers
);

// Get recent members
router.get(
"/members/recent",
protect,
isAdminOrSuperAdmin,
getRecentMembers
);

// Get member statistics
router.get(
"/members/statistics",
protect,
isAdminOrSuperAdmin,
getStatistics
);

// Filter members
router.get(
"/members/filter",
protect,
isAdminOrSuperAdmin,
filterMembers
);

// Monthly registrations
router.get(
"/members/monthly-registrations",
protect,
isAdminOrSuperAdmin,
monthlyRegistrations
);

// Contribution summary
router.get(
"/members/contribution-summary",
protect,
isAdminOrSuperAdmin,
contributionSummary
);

// Get single member
router.get(
"/members/:id",
protect,
isAdminOrSuperAdmin,
getMember
);

// Create member
router.post(
"/members",
protect,
isAdminOrSuperAdmin,
createMember
);

// Update member
router.put(
"/members/:id",
protect,
isAdminOrSuperAdmin,
updateMember
);

// Suspend member
router.patch(
"/members/:id/suspend",
protect,
isAdminOrSuperAdmin,
suspendMember
);

// Activate member
router.patch(
"/members/:id/activate",
protect,
isAdminOrSuperAdmin,
activateMember
);

// Soft delete member
router.delete(
"/members/:id",
protect,
isAdminOrSuperAdmin,
deleteMember
);

// Restore member
router.patch(
"/members/:id/restore",
protect,
isAdminOrSuperAdmin,
restoreMember
);

// Reset member password
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
