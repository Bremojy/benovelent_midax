const jwt = require("jsonwebtoken");

const Admin = require("../models/Admin");
const Member = require("../models/Member");

const auth = async (req, res, next) => {
  try {
    let token = null;

    // ===============================
    // GET TOKEN
    // ===============================
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // ===============================
    // VERIFY TOKEN
    // ===============================
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ===============================
    // FIND USER
    // ===============================
    let user = await Admin.findById(decoded.id).select("-password");

    if (!user) {
      user = await Member.findById(decoded.id).select("-password");
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    // ===============================
    // ATTACH USER
    // ===============================
    req.user = user;

    next();
  } catch (error) {
    console.error("Authentication Error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = auth;