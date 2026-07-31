// =====================================
// services/auditService.js
// =====================================

const AuditLog = require("../models/AuditLog");

// =====================================
// CREATE AUDIT LOG
// =====================================

const logActivity = async ({
  user = null,
  action,
  module,
  description,
  ipAddress = "",
  metadata = {},
}) => {
  try {
    await AuditLog.create({
      user,
      action,
      module,
      description,
      ipAddress,
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