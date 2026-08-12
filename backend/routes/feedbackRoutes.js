const express = require("express");
const router = express.Router();
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isAdminOrSuperAdmin, isMember } = require("../middleware/roleMiddleware");
const controller = require("../controllers/feedbackController");

router.get("/", protect, controller.list);
router.post("/", protect, isAdminOrSuperAdmin, controller.create);
router.put("/:id", protect, isAdminOrSuperAdmin, controller.update);
router.delete("/:id", protect, isAdminOrSuperAdmin, controller.remove);
router.post("/:id/responses", protect, isMember, controller.submit);
router.get("/:id/responses", protect, isAdminOrSuperAdmin, controller.responses);

module.exports = router;
