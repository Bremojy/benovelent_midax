const jwt = require("jsonwebtoken");

const SuperAdmin = require("../models/SuperAdmin");
const Admin = require("../models/Admin");
const Member = require("../models/Member");

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      let user = await SuperAdmin.findById(decoded.id).select("-password");

      if (!user)
        user = await Admin.findById(decoded.id).select("-password");

      if (!user)
        user = await Member.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      req.user = user;

      next();
    } else {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token invalid or expired",
    });
  }
};

module.exports = protect;