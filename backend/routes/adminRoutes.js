const express = require("express");
const {
  uploadFields,
  setUploadType,
} = require("../middleware/upload");
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
  isSuperAdmin,
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
  getProfile,
  updateProfile,
  changePassword,
  getSettings,
  updateSettings,
  getColleagues,
  openClaimDocument,
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
// ADMIN PROFILE / SECURITY / PREFERENCES
// =======================================

router.get("/profile", protect, isAdmin, getProfile);

router.put(
  "/profile",
  protect,
  isAdmin,
  setUploadType("profiles"),
  uploadFields([{ name: "profileImage", maxCount: 1 }]),
  updateProfile
);

router.put("/change-password", protect, isAdmin, changePassword);

router.get("/settings", protect, isAdmin, getSettings);
router.put("/settings", protect, isAdmin, updateSettings);
router.get("/colleagues", protect, isAdminOrSuperAdmin, getColleagues);
router.post("/claims/:type/:id/open", protect, isAdmin, openClaimDocument);

router.post(
  "/members",
  protect,
  isAdminOrSuperAdmin,
  setUploadType("member-documents"),
  uploadFields([
    { name: "profileImage", maxCount: 1 },
    { name: "passportPhoto", maxCount: 1 },
    { name: "nationalIdFront", maxCount: 1 },
    { name: "nationalIdBack", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  createMember
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
  isSuperAdmin,
  deleteMember
);

// =======================================
// RESTORE MEMBER
// =======================================

router.patch(
  "/members/:id/restore",
  protect,
  isSuperAdmin,
  restoreMember
);

// =======================================
// RESET MEMBER PASSWORD
// =======================================

router.patch(
  "/members/:id/reset-password",
  protect,
  isSuperAdmin,
  resetPassword
);

// =======================================
// EXPORT
// =======================================

module.exports = router;
