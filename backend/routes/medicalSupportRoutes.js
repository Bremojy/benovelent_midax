const express = require("express");

const router = express.Router();

const medicalController = require("../controllers/medicalSupportController");

const { verifyToken } = require("../middleware/authMiddleware");

const {
    isMember,
    isAdmin,
    isSuperAdmin,
    isAdminOrSuperAdmin
} = require("../middleware/roleMiddleware");

const { uploadArray, setUploadType } = require("../middleware/upload");
const verified = require("../middleware/verifiedMiddleware");
const memberStatus = require("../middleware/memberStatusMiddleware");
const profileCompleted = require("../middleware/profileCompletionMiddleware");

// ======================================================
// MEMBER ROUTES
// ======================================================

// Create Medical Application
router.post(
    "/apply",
    verifyToken,
    isMember,
    verified,
    memberStatus,
    profileCompleted,
    setUploadType("documents"),
    uploadArray("documents", 10),
    medicalController.createMedicalApplication
);

// Get Logged-in Member Applications
router.get(
    "/my-applications",
    verifyToken,
    isMember,
    verified,
    memberStatus,
    profileCompleted,
    medicalController.getMyApplications
);

// Get Single Application
router.get(
    "/:id",
    verifyToken,
    isMember,
    verified,
    memberStatus,
    profileCompleted,
    medicalController.getApplicationById
);

// Cancel Application (Only if Pending)
router.put(
    "/cancel/:id",
    verifyToken,
    isMember,
    verified,
    memberStatus,
    profileCompleted,
    medicalController.cancelApplication
);

// ======================================================
// ADMIN ROUTES
// ======================================================

// Dashboard Summary
router.get(
    "/admin/summary",
    verifyToken,
    isAdminOrSuperAdmin,
    medicalController.getMedicalSummary
);

// Get All Applications
router.get(
    "/admin/applications",
    verifyToken,
    isAdminOrSuperAdmin,
    medicalController.getAllApplications
);

// Move to Under Review
router.put(
    "/admin/review/:id",
    verifyToken,
    isAdminOrSuperAdmin,
    medicalController.markUnderReview
);

// Approve
router.put(
    "/admin/approve/:id",
    verifyToken,
    isAdminOrSuperAdmin,
    medicalController.approveApplication
);

// Reject
router.put(
    "/admin/reject/:id",
    verifyToken,
    isAdminOrSuperAdmin,
    medicalController.rejectApplication
);

// Mark as Paid
router.put(
    "/admin/pay/:id",
    verifyToken,
    isAdminOrSuperAdmin,
    medicalController.markAsPaid
);

// ======================================================
// SUPER ADMIN
// ======================================================

// Permanently Delete
router.delete(
    "/admin/delete/:id",
    verifyToken,
    isSuperAdmin,
    medicalController.deleteApplication
);

module.exports = router;
