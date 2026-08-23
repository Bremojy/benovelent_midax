const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { isAdminOrSuperAdmin } = require("../middleware/roleMiddleware");
const controller = require("../controllers/claimWorkflowController");
router.get("/statuses", verifyToken, isAdminOrSuperAdmin, controller.statuses);
router.get("/", verifyToken, isAdminOrSuperAdmin, controller.list);
router.put("/:type/:id/stage", verifyToken, isAdminOrSuperAdmin, controller.updateStage);
module.exports = router;
