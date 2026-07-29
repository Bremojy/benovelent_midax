const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getProfile,
  updateProfile,
  getSummary,
  getSettings,
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

router.get("/settings", protect, getSettings);
router.put("/settings", protect, updateSettings);

module.exports = router;