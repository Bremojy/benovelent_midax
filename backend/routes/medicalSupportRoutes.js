const express = require("express");

const router = express.Router();

const medicalController = require("../controllers/medicalSupportController");

const { verifyToken } = require("../middleware/authMiddleware");

const {
    isMember,
    isAdmin,
    isSuperAdmin
} = require("../middleware/roleMiddleware");

const { uploadArray, setUploadType } = require("../middleware/upload");

console.log("verifyToken:", typeof verifyToken);
console.log("isMember:", typeof isMember);
console.log("isAdmin:", typeof isAdmin);
console.log("isSuperAdmin:", typeof isSuperAdmin);

console.log(
    "createMedicalApplication:",
    typeof medicalController.createMedicalApplication
);

console.log(
    "getMyApplications:",
    typeof medicalController.getMyApplications
);

console.log(
    "getMedicalSummary:",
    typeof medicalController.getMedicalSummary
);


// ======================================================
// MEMBER ROUTES
// ======================================================

// Create Medical Application
router.post(
    "/apply",
    verifyToken,
    isMember,
    setUploadType("support"),
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
    isAdmin,
    medicalController.getMedicalSummary
);

// Get All Applications
router.get(
    "/admin/applications",
    verifyToken,
    isAdmin,
    medicalController.getAllApplications
);

// Move to Under Review
router.put(
    "/admin/review/:id",
    verifyToken,
    isAdmin,
    medicalController.markUnderReview
);

// Approve
router.put(
    "/admin/approve/:id",
    verifyToken,
    isAdmin,
    medicalController.approveApplication
);

// Reject
router.put(
    "/admin/reject/:id",
    verifyToken,
    isAdmin,
    medicalController.rejectApplication
);

// Mark as Paid
router.put(
    "/admin/pay/:id",
    verifyToken,
    isAdmin,
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