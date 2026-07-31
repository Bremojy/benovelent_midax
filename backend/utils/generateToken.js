const jwt = require("jsonwebtoken");

const generateToken = (user) => {
  // =====================================
  // VALIDATE ENVIRONMENT
  // =====================================

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  // =====================================
  // CREATE JWT
  // =====================================

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      issuer: "benevolent-midax",
      audience: "benevolent-midax-users",
      subject: user._id.toString(),
    }
  );
};

module.exports = generateToken;