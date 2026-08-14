const express = require("express");
const router = express.Router();
const controller = require("../controllers/platformController");
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isAdminOrSuperAdmin } = require("../middleware/roleMiddleware");

router.post("/assistant", protect, controller.assistant);
router.post("/public/assistant", controller.assistant);
router.get("/activity", protect, controller.activityCenter);
router.get("/directory", protect, controller.directory);
router.get("/search", protect, controller.search);
router.get("/events", protect, controller.events);
router.post("/events", protect, isAdminOrSuperAdmin, controller.createEvent);
router.post("/events/:id/rsvp", protect, controller.rsvp);
router.get("/analytics", protect, isAdminOrSuperAdmin, controller.analytics);
router.get("/documents", protect, controller.documents);
router.get("/membership-card", protect, controller.membershipCard);
router.get("/membership-card/:memberId", protect, isAdminOrSuperAdmin, controller.membershipCard);
router.get("/assistant-context", protect, controller.assistantContext);
router.get("/membership/verify", controller.verifyMembership);
router.get("/public/events", controller.publicEvents);
router.get("/public/documents", controller.publicDocuments);

module.exports = router;
