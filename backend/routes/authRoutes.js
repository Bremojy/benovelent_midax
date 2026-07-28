const express = require("express");

const router = express.Router();


const authController = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

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
// Login
router.post("/login", authController.login);

// Current logged-in user
router.get("/me", protect, authController.getMe);

// Logout
router.post("/logout", protect, authController.logout);


module.exports = router;