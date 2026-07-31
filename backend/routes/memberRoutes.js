const express = require("express");
const profileCompleted = require("../middleware/profileCompletionMiddleware");
const {
  uploadFields,
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
} = require("../controllers/memberController");


const { verifyToken: protect } = require("../middleware/authMiddleware");

// ===============================
// DASHBOARD
// ===============================

router.get("/dashboard", protect, getDashboard);

// ===============================
// PROFILE
// ===============================

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// ===============================
// SUMMARY
// ===============================

router.get("/summary", protect, getSummary);

// ===============================
// SETTINGS
// ===============================

// Change password
router.put(
  "/change-password",
  protect,
  changePassword
);

router.put(
    "/profile",
    protect,
    uploadFields([
        { name: "profileImage", maxCount: 1 },
        { name: "passportPhoto", maxCount: 1 },
        { name: "nationalIdFront", maxCount: 1 },
        { name: "nationalIdBack", maxCount: 1 },
        { name: "signature", maxCount: 1 },
    ]),
    updateProfile
);

// Profile completion & benefit eligibility
router.get(
  "/profile-status",
  protect,
  getProfileStatus
);

router.get(
    "/eligibility",
    profileCompleted,
    protect,
    getEligibility
);

router.get("/settings", protect, getSettings);
router.put("/settings", protect, updateSettings);

module.exports = router;