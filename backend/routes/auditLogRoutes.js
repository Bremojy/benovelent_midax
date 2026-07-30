const express = require("express");

const router = express.Router();

const {

    getAuditLogs,

    getAuditLog,

    deleteAuditLog,

    getAuditSummary

} = require("../controllers/auditLogController");

const protect =
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

// ====================================
// DELETE
// ====================================

router.delete(
    "/:id",
    protect,
    superAdmin,
    deleteAuditLog
);

module.exports = router;