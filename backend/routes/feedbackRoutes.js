const express = require("express");
const router = express.Router();
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isAdminOrSuperAdmin } = require("../middleware/roleMiddleware");
const controller = require("../controllers/feedbackController");
const multer = require("multer");
const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/", protect, controller.list);
router.get("/pending/login", protect, controller.pendingLogin);
router.post("/", protect, isAdminOrSuperAdmin, controller.create);
router.post("/built-in", protect, isAdminOrSuperAdmin, controller.ensureBuiltIn);
router.post("/auto-generate", protect, isAdminOrSuperAdmin, controller.autoGenerate);
router.put("/:id", protect, isAdminOrSuperAdmin, controller.update);
router.delete("/:id", protect, isAdminOrSuperAdmin, controller.remove);
router.post("/:id/responses", protect, controller.submit);
router.get("/:id/responses", protect, isAdminOrSuperAdmin, controller.responses);
router.get("/:id/export", protect, isAdminOrSuperAdmin, controller.exportResponses);
router.post("/:id/import", protect, isAdminOrSuperAdmin, importUpload.single("file"), controller.importResponses);
router.post("/:id/publish-news", protect, isAdminOrSuperAdmin, controller.publishToNews);
router.get("/published/:id/download", protect, controller.memberDownload);

module.exports = router;
