const express = require("express");
const profileCompleted = require("../middleware/profileCompletionMiddleware");
const {
  uploadFields,
  uploadArray,
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
const supportRequestController = require("../controllers/supportRequestController");


const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isMember, isChatUser } = require("../middleware/roleMiddleware");

// ===============================
// DASHBOARD
// ===============================

router.get("/dashboard", protect, getDashboard);
router.get("/community-stats", protect, getCommunityStats);

// ===============================
// PROFILE
// ===============================

router.get("/profile", protect, isMember, getProfile);

router.put(
  "/profile",
  protect,
  isMember,
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
  isMember,
  profileCompleted,
  getMemberContributions
);

router.get("/finance", protect, profileCompleted, getMemberTransactions);
router.get("/accounts", protect, profileCompleted, getMemberAccounts);

// ===============================
// MEMBER CLAIMS / SUPPORT HISTORY
// ===============================

router.get(
  "/claims",
  protect,
  profileCompleted,
  getClaims
);

// Allow members to submit support requests from the member portal.
router.post(
  "/claims",
  protect,
  isMember,
  profileCompleted,
  setUploadType("documents"),
  uploadArray("documents", 30),
  supportRequestController.create
);


// ===============================
// CHAT MEMBERS
// ===============================

router.get("/chat-members", protect, isChatUser, getChatMembers);

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