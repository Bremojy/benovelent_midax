// ==============================================
// ROLE AUTHORIZATION MIDDLEWARE
// Allows only specified roles to access a route
// ==============================================

const roleAuth = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Ensure authentication middleware ran first
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      // Check user's role
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You do not have permission.",
        });
      }

      next();
    } catch (error) {
      console.error("Role Authorization Error:", error);

      return res.status(500).json({
        success: false,
        message: "Authorization failed.",
      });
    }
  };
};

module.exports = roleAuth;