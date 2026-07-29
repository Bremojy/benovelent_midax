const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getProfile,
  updateProfile,
  getSummary,
} = require("../controllers/memberController");

const protect = require("../middleware/authMiddleware");

// Member dashboard
router.get("/dashboard", protect, getDashboard);

// Profile
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

// Summary
router.get("/summary", protect, getSummary);

module.exports = router;