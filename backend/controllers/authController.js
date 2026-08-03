const asyncHandler = require("../utils/asyncHandler");
const Response = require("../utils/response");

const ROLES = require("../constants/roles");
const bcrypt = require("bcryptjs");

const Member = require("../models/Member");
const Admin = require("../models/Admin");
const SuperAdmin = require("../models/SuperAdmin");

const generateToken = require("../utils/generateToken");
const { ensureChatProfile } = require("../utils/chatProfile");

const {
    LOGIN_ALLOWED,
} = require("../constants/memberStatus");

const auditService = require("../services/auditService");

const notificationService = require("../services/notificationService");

// ==========================================
// LOGIN
// MEMBER / ADMIN / SUPERADMIN
// ==========================================

exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // --------------------------------------
    // VALIDATION
    // --------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    email = email.trim().toLowerCase();

    // --------------------------------------
    // FIND ACCOUNT
    // --------------------------------------

    let user = null;
    let accountType = null;

    // SUPERADMIN
    user = await SuperAdmin.findOne({ email });

    if (user) {
      accountType = "superadmin";
    }

    // ADMIN
    if (!user) {
      user = await Admin.findOne({ email });

      if (user) {
        accountType = "admin";
      }
    }

    // MEMBER
    if (!user) {
      user = await Member.findOne({ email });

      if (user) {
        accountType = "member";
      }
    }

    // --------------------------------------
    // ACCOUNT NOT FOUND
    // --------------------------------------

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
      });
    }

    // --------------------------------------
    // ENSURE ROLE IS CORRECT
    // --------------------------------------

    if (!user.role) {
      user.role = accountType;
    }

    if (user.role !== accountType) {
      return res.status(403).json({
        success: false,
        message: "Account role configuration is invalid.",
        code: "ROLE_MISMATCH",
      });
    }

    // --------------------------------------
    // ACCOUNT STATUS
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
    // ACCOUNT LOCK
    // --------------------------------------

    if (
      user.accountLockedUntil &&
      new Date(user.accountLockedUntil) > new Date()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is temporarily locked. Please try again later.",
        code: "ACCOUNT_LOCKED",
        lockedUntil: user.accountLockedUntil,
      });
    }

    // --------------------------------------
    // PASSWORD
    // --------------------------------------

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
      });
    }

    // --------------------------------------
    // SUCCESSFUL LOGIN
    // --------------------------------------

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLogin = new Date();
    user.lastSeen = new Date();

    await user.save();

    // --------------------------------------
    // CHAT PROFILE (ADMIN / SUPERADMIN)
    // --------------------------------------

    let chatProfile = user;
    if (user.role === "admin" || user.role === "superadmin") {
      try {
        chatProfile = await ensureChatProfile(user);
      } catch (chatError) {
        console.error("Chat profile sync error:", chatError);
      }
    }

    // --------------------------------------
    // GENERATE TOKEN
    // --------------------------------------

    const token = generateToken(user, {
      chatId: chatProfile?._id?.toString?.() || user._id.toString(),
    });

    // --------------------------------------
    // NORMALIZED NAME
    // --------------------------------------

    const fullName =
      user.fullName ||
      user.name ||
      "";

    const chatId = chatProfile?._id?.toString?.() || user._id.toString();

    // --------------------------------------
    // RESPONSE
    // --------------------------------------

    return res.status(200).json({
      success: true,

      message: "Login successful.",

      token,

      user: {
        id: user._id,
        chatId,
        fullName,
        email: user.email,
        role: user.role,

        profileImage:
          user.profileImage ||
          user.profilePhoto ||
          "",

        themeColor:
          user.themeColor ||
          "#ff7a00",

        memberNumber:
          user.memberNumber || null,

        phone:
          user.phone || "",

        status:
          user.status || "active",

        verified:
          user.verified ?? false,

        mustChangePassword:
          user.mustChangePassword ?? false,

        profileCompletion:
          user.profileCompletion ?? null,

        lastLogin:
          user.lastLogin,

        lastSeen:
          user.lastSeen,
      },
    });

  } catch (error) {
    console.error(
      "Login Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server Error.",
    });
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================

exports.getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const user = req.user;

    return res.status(200).json({
      success: true,

      user: {
        id: user._id,

        chatId:
          req.auth?.chatId || user._id.toString(),

        fullName:
          user.fullName ||
          user.name ||
          "",

        name:
          user.name ||
          user.fullName ||
          "",

        email:
          user.email,

        role:
          user.role,

        phone:
          user.phone || "",

        status:
          user.status || "active",

        profileImage:
          user.profileImage ||
          user.profilePhoto ||
          "",

        memberNumber:
          user.memberNumber || null,

        verified:
          user.verified ?? false,

        profileCompletion:
          user.profileCompletion ?? null,

        mustChangePassword:
          user.mustChangePassword ?? false,

        lastLogin:
          user.lastLogin,

        lastSeen:
          user.lastSeen,

        createdAt:
          user.createdAt,
      },
    });

  } catch (error) {
    console.error(
      "Get Me Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve current user.",
    });
  }
};

// ==========================================
// LOGOUT
// ==========================================

exports.logout = async (req, res) => {
  try {
    if (req.user) {
      req.user.lastSeen = new Date();

      if ("online" in req.user) {
        req.user.online = false;
      }

      if ("socketId" in req.user) {
        req.user.socketId = "";
      }

      await req.user.save();
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });

  } catch (error) {
    console.error(
      "Logout Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Logout failed.",
    });
  }
};