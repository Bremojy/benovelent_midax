const jwt = require('jsonwebtoken');

const generateToken = (user, extra = {}) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  const payload = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    ...extra,
    sessionVersion: Number(user.sessionVersion || 0),
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'benevolent-midax',
    audience: 'benevolent-midax-users',
    subject: user._id.toString(),
  });
};

module.exports = generateToken;
