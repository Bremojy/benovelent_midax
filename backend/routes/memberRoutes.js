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
} = require("../controllers/memberController");

const { getMemberContributions } = require("../controllers/contributionController");
const { getMemberTransactions } = require("../controllers/financeController");


const { verifyToken: protect } = require("../middleware/authMiddleware");

// ===============================
// DASHBOARD
// ===============================

router.get("/dashboard", protect, getDashboard);

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

router.get(
  "/finance",
  protect,
  getMemberTransactions
);

// ===============================
// MEMBER CLAIMS / SUPPORT HISTORY
// ===============================

router.get(
  "/claims",
  protect,
  getClaims
);

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