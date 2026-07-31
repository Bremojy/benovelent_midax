// ==========================================
// ROLE AUTHORIZATION MIDDLEWARE
// ==========================================

const authorize = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
          code: "AUTH_REQUIRED",
        });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
          code: "ACCESS_DENIED",
          requiredRoles: roles,
        });
      }

      next();
    } catch (error) {
      console.error("Role Authorization Error:", error);

      return res.status(500).json({
        success: false,
        message: "Authorization error.",
      });
    }
  };
};

// ==========================================
// MEMBER
// ==========================================

const isMember = authorize("member");

// ==========================================
// ADMIN ONLY
// ==========================================

const isAdmin = authorize("admin");

// ==========================================
// SUPERADMIN ONLY
// ==========================================

const isSuperAdmin = authorize("superadmin");

// ==========================================
// ADMIN OR SUPERADMIN
// ==========================================

const isAdminOrSuperAdmin = authorize(
  "admin",
  "superadmin"
);

module.exports = {
  authorize,
  isMember,
  isAdmin,
  isSuperAdmin,
  isAdminOrSuperAdmin,
};