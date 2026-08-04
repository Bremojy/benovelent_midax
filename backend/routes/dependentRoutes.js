const express = require("express");

const router = express.Router();

const {

    addDependent,

    getDependents,

    getDependent,

    updateDependent,

    deleteDependent,

    verifyDependent,

    getAllDependents,

    getDependentsForMember

} = require("../controllers/dependentController");

const { verifyToken: protect } = require("../middleware/authMiddleware");

const verified = require("../middleware/verifiedMiddleware");

const profileCompleted =
require("../middleware/profileCompletionMiddleware");

const memberStatus =
require("../middleware/memberStatusMiddleware");

const admin =
require("../middleware/adminMiddleware");

// =======================================
// MEMBER ROUTES
// =======================================

// Add dependent

router.post(
    "/",
    protect,
    verified,
    memberStatus,
    profileCompleted,
    addDependent
);

// My dependents

router.get(
    "/my",
    protect,
    getDependents
);

// Single dependent

router.get(
    "/:id",
    protect,
    getDependent
);

// Update

router.put(
    "/:id",
    protect,
    verified,
    memberStatus,
    profileCompleted,
    updateDependent
);

// Delete

router.delete(
    "/:id",
    protect,
    deleteDependent
);

// =======================================
// ADMIN
// =======================================

// View all dependents

router.get("/admin/member/:memberId", protect, admin, getDependentsForMember);
router.get("/", protect, admin, getAllDependents);

// Verify dependent

router.put(
    "/:id/verify",
    protect,
    admin,
    verifyDependent
);

module.exports = router;
