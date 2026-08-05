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

// ======================================================
// MEMBER ROUTES
// ======================================================

// Create Medical Application
router.post(
    "/apply",
    verifyToken,
    isMember,
    setUploadType("documents"),
    uploadArray("documents", 10),
    medicalController.createMedicalApplication
);

// Get Logged-in Member Applications
router.get(
    "/my-applications",
    verifyToken,
    isMember,
    medicalController.getMyApplications
);

// Get Single Application
router.get(
    "/:id",
    verifyToken,
    medicalController.getApplicationById
);

// Cancel Application (Only if Pending)
router.put(
    "/cancel/:id",
    verifyToken,
    isMember,
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
