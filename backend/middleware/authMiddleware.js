const jwt = require("jsonwebtoken");

const SuperAdmin = require("../models/SuperAdmin");
const Admin = require("../models/Admin");
const Member = require("../models/Member");
const Response = require("../utils/response");
const { ensureChatProfile } = require("../utils/chatProfile");

const ROLES = require("../constants/roles");
const { ACCESS_COOKIE } = require("../utils/authCookies");

const {
    LOGIN_ALLOWED,
} = require("../constants/memberStatus");
// ==========================================
// AUTHENTICATE USER
// ==========================================

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[ACCESS_COOKIE];

    // Prefer the HttpOnly browser session cookie. A bearer token remains as a
    // compatibility path for controlled non-browser clients/mobile builds.
    const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "");

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
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
        issuer: "benevolent-midax",
        audience: "benevolent-midax-users",
      }
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

    const tokenSessionVersion = Number(decoded.sessionVersion ?? 0);
    const currentSessionVersion = Number(user.sessionVersion ?? 0);

    if (tokenSessionVersion !== currentSessionVersion) {
      return res.status(401).json({
        success: false,
        message: "Your account was signed in on another device. This session has been logged out.",
        code: "SESSION_REPLACED",
      });
    }

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
    // CANONICAL CHAT IDENTITY
    // --------------------------------------
    // Conversations are stored against Member chat-profile IDs. Older tokens
    // may not contain chatId, so resolve the portal account to its canonical
    // chat profile once here rather than allowing mixed Admin/Member IDs.
    if (!req.auth.chatId && (role === "admin" || role === "superadmin")) {
      try {
        const chatProfile = await ensureChatProfile(user);
        if (chatProfile?._id) req.auth.chatId = chatProfile._id.toString();
      } catch (chatError) {
        console.warn("Chat identity sync skipped:", chatError?.message || chatError);
      }
    }

    // --------------------------------------
    // ATTACH USER TO REQUEST
    // --------------------------------------

    req.user = user;
    req.user.chatMemberId = req.auth.chatId || user._id.toString();

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