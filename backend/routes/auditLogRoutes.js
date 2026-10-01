const express = require("express");

const router = express.Router();

const {
    getAuditLogs,
    getAuditLog,
    getAuditSummary,
    getAuditCoverage,
} = require("../controllers/auditLogController");

const { verifyToken: protect } =
require("../middleware/authMiddleware");

const admin =
require("../middleware/adminMiddleware");

const superAdmin =
require("../middleware/superAdminMiddleware");

// ====================================
// SUMMARY
// ====================================

router.get(
    "/summary",
    protect,
    admin,
    getAuditSummary
);

// ====================================
// ALL LOGS
// ====================================

router.get(
    "/coverage",
    protect,
    admin,
    getAuditCoverage
);

router.get(
    "/",
    protect,
    admin,
    getAuditLogs
);

// ====================================
// SINGLE LOG
// ====================================

router.get(
    "/:id",
    protect,
    admin,
    getAuditLog
);

module.exports = router;
