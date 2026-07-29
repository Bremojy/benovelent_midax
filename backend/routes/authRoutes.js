const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

// Login (SuperAdmin/Admin/Member)
router.post("/login", authController.login);

// Logged in user
router.get("/me", protect, authController.getMe);

// Logout
router.post("/logout", protect, authController.logout);

module.exports = router;