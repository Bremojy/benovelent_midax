const express = require("express");

const router = express.Router();

const { verifyToken: protect } = require("../middleware/authMiddleware");

const requireVerifiedMember =
require("../middleware/verifiedMiddleware");

const profileCompleted =
require("../middleware/profileCompletionMiddleware");

const requireActiveMember =
require("../middleware/memberStatusMiddleware");

const requireAdmin =
require("../middleware/adminMiddleware");

const requireSuperAdmin =
require("../middleware/superAdminMiddleware");

const { uploadFields, setUploadType } = require("../middleware/upload");

const {
    applyEducationSupport,
    getMyApplications,
    getApplicationById,
    getAllApplications,
    getEducationSummary,
    approveApplication,
    rejectApplication,
    disburseFunds,
    recordRepayment,
    deleteApplication,
} = require("../controllers/educationSupportController");

// ======================================================
// MEMBER ROUTES
// ======================================================

// Apply
router.post(
    "/apply",
    protect,
    requireVerifiedMember,
    profileCompleted,
    requireActiveMember,
    setUploadType("support"),
    uploadFields([
        { name: "feeStructure", maxCount: 1 },
        { name: "admissionLetter", maxCount: 1 },
        { name: "supportingDocuments", maxCount: 10 },
    ]),
    applyEducationSupport
);

// View my applications
router.get(
    "/my-applications",
    protect,
    getMyApplications
);

// View single application
router.get(
    "/:id",
    protect,
    getApplicationById
);

// ======================================================
// ADMIN ROUTES
// ======================================================

// Dashboard summary
router.get(
    "/dashboard",
    protect,
    requireAdmin,
    getEducationSummary
);

// Get all applications
router.get(
    "/",
    protect,
    requireAdmin,
    getAllApplications
);

// Approve
router.put(
    "/:id/approve",
    protect,
    requireAdmin,
    approveApplication
);

// Reject
router.put(
    "/:id/reject",
    protect,
    requireAdmin,
    rejectApplication
);

// Disburse
router.put(
    "/:id/disburse",
    protect,
    requireAdmin,
    disburseFunds
);

// Record repayment
router.put(
    "/:id/repayment",
    protect,
    requireAdmin,
    recordRepayment
);

// ======================================================
// SUPER ADMIN
// ======================================================

router.delete(
    "/:id",
    protect,
    requireSuperAdmin,
    deleteApplication
);

module.exports = router;