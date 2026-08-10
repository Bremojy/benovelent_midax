// =====================================
// services/auditService.js
// =====================================

const AuditLog = require("../models/AuditLog");

// =====================================
// CREATE AUDIT LOG
// =====================================

const logActivity = async ({
  user = null,
  userModel = "Member",
  userRole = "member",
  action,
  module,
  description,
  ipAddress = "",
  userAgent = "",
  endpoint = "",
  method = "",
  status = "SUCCESS",
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      user,
      userModel,
      userRole,
      action,
      module,
      description,
      ipAddress,
      userAgent,
      endpoint,
      method,
      status,
      metadata,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Audit Log Error:", error.message);
  }
};

module.exports = {
  logActivity,
};