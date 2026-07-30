const express = require("express");

const router = express.Router();

const {

    applyFuneralSupport,

    getMyApplications,

    getApplicationById,

    getAllApplications,

    getFuneralSummary,

    approveApplication,

    rejectApplication,

    recordPayment,

    closeApplication,

    deleteApplication

} = require("../controllers/funeralSupportController");

const protect =
require("../middleware/authMiddleware");

const verified =
require("../middleware/verifiedMiddleware");

const memberStatus =
require("../middleware/memberStatusMiddleware");

const profileCompleted =
require("../middleware/profileMiddleware");

const admin =
require("../middleware/adminMiddleware");

const superAdmin =
require("../middleware/superAdminMiddleware");

// =====================================
// MEMBER ROUTES
// =====================================

router.post(

    "/apply",

    protect,

    verified,

    memberStatus,

    profileCompleted,

    applyFuneralSupport

);

router.get(

    "/my-applications",

    protect,

    getMyApplications

);

router.get(

    "/:id",

    protect,

    getApplicationById

);

// =====================================
// ADMIN ROUTES
// =====================================

router.get(

    "/",

    protect,

    admin,

    getAllApplications

);

router.get(

    "/dashboard/summary",

    protect,

    admin,

    getFuneralSummary

);

router.put(

    "/:id/approve",

    protect,

    admin,

    approveApplication

);

router.put(

    "/:id/reject",

    protect,

    admin,

    rejectApplication

);

router.put(

    "/:id/payment",

    protect,

    admin,

    recordPayment

);

router.put(

    "/:id/close",

    protect,

    admin,

    closeApplication

);

// =====================================
// SUPER ADMIN
// =====================================

router.delete(

    "/:id",

    protect,

    superAdmin,

    deleteApplication

);

module.exports = router;