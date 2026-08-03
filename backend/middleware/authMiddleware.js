const jwt = require("jsonwebtoken");

const SuperAdmin = require("../models/SuperAdmin");
const Admin = require("../models/Admin");
const Member = require("../models/Member");
const Response = require("../utils/response");

const ROLES = require("../constants/roles");

const {
    LOGIN_ALLOWED,
} = require("../constants/memberStatus");
// ==========================================
// AUTHENTICATE USER
// ==========================================

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // --------------------------------------
    // CHECK AUTH HEADER
    // --------------------------------------

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing.",
        code: "TOKEN_MISSING",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing.",
        code: "TOKEN_MISSING",
      });
    }

    // --------------------------------------
    // VERIFY JWT
    // --------------------------------------

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.auth = decoded;

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
        code: "TOKEN_INVALID",
      });
    }

    // --------------------------------------
    // FIND USER
    // --------------------------------------

    let user = null;
    let userType = null;

    // SUPERADMIN
    user = await SuperAdmin.findById(decoded.id)
      .select("-password");

    if (user) {
      userType = "superadmin";
    }

    // ADMIN
    if (!user) {
      user = await Admin.findById(decoded.id)
        .select("-password");

      if (user) {
        userType = "admin";
      }
    }

    // MEMBER
    if (!user) {
      user = await Member.findById(decoded.id)
        .select("-password");

      if (user) {
        userType = "member";
      }
    }

    // --------------------------------------
    // USER NOT FOUND
    // --------------------------------------

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists.",
        code: "USER_NOT_FOUND",
      });
    }

    // --------------------------------------
    // NORMALIZE ROLE
    // --------------------------------------

    const role = user.role || userType;

    // --------------------------------------
    // CHECK ROLE CONSISTENCY
    // --------------------------------------

    if (role !== userType) {
      console.error(
        `Role mismatch for user ${user._id}: database=${role}, collection=${userType}`
      );

      return res.status(403).json({
        success: false,
        message: "Account role configuration is invalid.",
        code: "ROLE_MISMATCH",
      });
    }

    // --------------------------------------
    // CHECK ACCOUNT STATUS
    // --------------------------------------

    if (
      user.status &&
      user.status !== "active"
    ) {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
        code: "ACCOUNT_INACTIVE",
        status: user.status,
      });
    }

    // --------------------------------------
    // CHECK ACCOUNT LOCK
    // --------------------------------------

    if (
      user.accountLockedUntil &&
      new Date(user.accountLockedUntil) > new Date()
    ) {
      return res.status(403).json({
        success: false,
        message: "Your account is temporarily locked.",
        code: "ACCOUNT_LOCKED",
        lockedUntil: user.accountLockedUntil,
      });
    }

    // --------------------------------------
    // ATTACH USER TO REQUEST
    // --------------------------------------

    req.user = user;

    req.userRole = role;

    req.userType = userType;

    next();

  } catch (error) {
    console.error(
      "Authentication Error:",
      error.message
    );

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
        code: "TOKEN_INVALID",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed.",
      code: "AUTH_FAILED",
    });
  }
};

module.exports = {
  verifyToken,
};