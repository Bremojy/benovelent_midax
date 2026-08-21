const express = require("express");

const router = express.Router();

// =====================================================
// CONTROLLERS
// =====================================================

const authController = require("../controllers/authController");
const { csrfEndpoint } = require("../middleware/csrfMiddleware");

// =====================================================
// MIDDLEWARE
// =====================================================

const {
    verifyToken: protect,
} = require("../middleware/authMiddleware");

// =====================================================
// AUTH ROUTES
// =====================================================

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate Member/Admin/SuperAdmin
 * @access  Public
 */
router.get("/csrf", csrfEndpoint);

router.post(
    "/login",
    authController.login
);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user
 * @access  Private
 */
router.get(
    "/me",
    protect,
    authController.getMe
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current user
 * @access  Private
 */
router.post(
    "/logout",
    protect,
    authController.logout
);

module.exports = router;