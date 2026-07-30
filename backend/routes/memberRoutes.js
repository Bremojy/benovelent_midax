const express = require("express");
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


const protect = require("../middleware/authMiddleware");

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

// Profile completion & benefit eligibility
router.get(
  "/profile-status",
  protect,
  getProfileStatus
);

router.get(
    "/eligibility",
    protect,
    getEligibility
);

router.get("/settings", protect, getSettings);
router.put("/settings", protect, updateSettings);

module.exports = router;