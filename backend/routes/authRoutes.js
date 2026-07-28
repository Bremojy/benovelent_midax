const express = require("express");

const router = express.Router();

const {
  adminSignup,
  adminLogin,
  memberLogin,
  memberLogout,
} = require("../controllers/authController");

const auth = require("../middleware/auth");

// ======================================
// ADMIN ROUTES
// ======================================

// Create Admin Account
router.post("/signup", adminSignup);

// Admin Login
router.post("/login", adminLogin);

// ======================================
// MEMBER ROUTES
// ======================================

// Member Login
router.post("/member/login", memberLogin);

// Member Logout (Protected)
router.post("/member/logout", auth, memberLogout);

module.exports = router;