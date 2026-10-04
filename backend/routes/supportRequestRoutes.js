const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { isMember, isAdminOrSuperAdmin, isSuperAdmin } = require("../middleware/roleMiddleware");
const profileCompleted = require("../middleware/profileCompletionMiddleware");
const { uploadArray, setUploadType } = require("../middleware/upload");
const controller = require("../controllers/supportRequestController");
const permissionController = require("../controllers/supportPermissionController");

router.post(
  "/",
  verifyToken,
  isMember,
  profileCompleted,
  setUploadType("documents"),
  uploadArray("documents", 30),
  controller.create
);

router.get("/mine", verifyToken, isMember, profileCompleted, controller.mine);
router.post("/permissions", verifyToken, isMember, profileCompleted, permissionController.create);
router.get("/permissions/mine", verifyToken, isMember, profileCompleted, permissionController.mine);
router.get("/permissions", verifyToken, isAdminOrSuperAdmin, permissionController.all);
router.get("/permissions/:id", verifyToken, isAdminOrSuperAdmin, permissionController.getOne);
router.put("/permissions/:id/approve", verifyToken, isAdminOrSuperAdmin, (req, res) => { req.body = { ...(req.body || {}), decision: "approve" }; return permissionController.review(req, res); });
router.put("/permissions/:id/reject", verifyToken, isAdminOrSuperAdmin, (req, res) => { req.body = { ...(req.body || {}), decision: "reject" }; return permissionController.review(req, res); });
router.put("/mine/:id", verifyToken, isMember, profileCompleted, setUploadType("documents"), uploadArray("documents", 30), controller.memberUpdate);
router.delete("/mine/:id", verifyToken, isMember, profileCompleted, controller.memberRemove);
router.get("/", verifyToken, isAdminOrSuperAdmin, controller.all);
router.get("/:id", verifyToken, isAdminOrSuperAdmin, controller.getOne);
router.put("/:id", verifyToken, isAdminOrSuperAdmin, controller.update);
router.delete("/:id", verifyToken, isSuperAdmin, controller.remove);

module.exports = router;
