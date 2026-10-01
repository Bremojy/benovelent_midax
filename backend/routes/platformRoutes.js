const express = require("express");
const router = express.Router();
const controller = require("../controllers/platformController");
const { verifyToken: protect } = require("../middleware/authMiddleware");
const verified = require("../middleware/verifiedMiddleware");
const memberStatus = require("../middleware/memberStatusMiddleware");
const profileCompleted = require("../middleware/profileCompletionMiddleware");
const { isAdminOrSuperAdmin } = require("../middleware/roleMiddleware");

router.get("/runtime-config", controller.runtimeConfig);
router.post("/assistant", protect, controller.assistant);
router.post("/public/assistant", controller.assistant);
router.get("/activity", protect, verified, memberStatus, profileCompleted, controller.activityCenter);
router.get("/directory", protect, verified, memberStatus, profileCompleted, controller.directory);
router.get("/search", protect, verified, memberStatus, profileCompleted, controller.search);
router.get("/events", protect, verified, memberStatus, profileCompleted, controller.events);
router.post("/events", protect, isAdminOrSuperAdmin, controller.createEvent);
router.post("/events/:id/rsvp", protect, verified, memberStatus, profileCompleted, controller.rsvp);
router.get("/analytics", protect, isAdminOrSuperAdmin, controller.analytics);
router.get("/documents", protect, verified, memberStatus, profileCompleted, controller.documents);
router.get("/membership-card", protect, verified, memberStatus, profileCompleted, controller.membershipCard);
router.get("/membership-card/:memberId", protect, isAdminOrSuperAdmin, controller.membershipCard);
router.get("/assistant-context", protect, verified, memberStatus, profileCompleted, controller.assistantContext);
router.get("/membership/verify", controller.verifyMembership);
router.get("/public/events", controller.publicEvents);
router.get("/public/documents", controller.publicDocuments);

module.exports = router;
