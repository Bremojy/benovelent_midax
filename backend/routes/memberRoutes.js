const express = require("express");
const profileCompleted = require("../middleware/profileCompletionMiddleware");
const {
  uploadFields,
  setUploadType,
} = require("../middleware/upload");
const router = express.Router();
const {
  getDashboard,
  getProfile,
  updateProfile,
  changePassword,
  getSummary,
  getProfileStatus,
  getSettings,
  getEligibility,
  updateSettings,
  getClaims,
  getChatMembers,
  getCommunityStats,
} = require("../controllers/memberController");

const { getMemberContributions } = require("../controllers/contributionController");
const { getMemberTransactions, getMemberAccounts } = require("../controllers/financeController");


const { verifyToken: protect } = require("../middleware/authMiddleware");

// ===============================
// DASHBOARD
// ===============================

router.get("/dashboard", protect, getDashboard);
router.get("/community-stats", protect, getCommunityStats);

// ===============================
// PROFILE
// ===============================

router.get("/profile", protect, getProfile);

router.put(
  "/profile",
  protect,
  setUploadType("profiles"),
  uploadFields([
    { name: "profileImage", maxCount: 1 },
    { name: "passportPhoto", maxCount: 1 },
    { name: "nationalIdFront", maxCount: 1 },
    { name: "nationalIdBack", maxCount: 1 },
    { name: "signature", maxCount: 1 },
  ]),
  updateProfile
);

// ===============================
// SUMMARY
// ===============================

router.get("/summary", protect, getSummary);

// ===============================
// MEMBER CONTRIBUTIONS / FINANCE
// ===============================

router.get(
  "/contributions",
  protect,
  getMemberContributions
);

router.get("/finance", protect, getMemberTransactions);
router.get("/accounts", protect, getMemberAccounts);

// ===============================
// MEMBER CLAIMS / SUPPORT HISTORY
// ===============================

router.get(
  "/claims",
  protect,
  getClaims
);


// ===============================
// CHAT MEMBERS
// ===============================

router.get("/chat-members", protect, getChatMembers);

// ===============================
// SETTINGS
// ===============================

// Change password
router.put(
  "/change-password",
  protect,
  changePassword
);

// Profile completion & benefit eligibility
router.get(
  "/profile-status",
  protect,
  getProfileStatus
);

router.get(
    "/eligibility",
    protect,
    profileCompleted,
    getEligibility
);

router.get(
  "/benefits",
  protect,
  profileCompleted,
  getEligibility
);

router.get("/settings", protect, getSettings);
router.put("/settings", protect, updateSettings);

module.exports = router;