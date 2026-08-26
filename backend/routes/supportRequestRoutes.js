const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { isMember, isAdminOrSuperAdmin, isSuperAdmin } = require("../middleware/roleMiddleware");
const { uploadArray, setUploadType } = require("../middleware/upload");
const controller = require("../controllers/supportRequestController");

router.post(
  "/",
  verifyToken,
  isMember,
  setUploadType("documents"),
  uploadArray("documents", 30),
  controller.create
);

router.get("/mine", verifyToken, isMember, controller.mine);
router.put("/mine/:id", verifyToken, isMember, setUploadType("documents"), uploadArray("documents", 30), controller.memberUpdate);
router.delete("/mine/:id", verifyToken, isMember, controller.memberRemove);
router.get("/", verifyToken, isAdminOrSuperAdmin, controller.all);
router.get("/:id", verifyToken, isAdminOrSuperAdmin, controller.getOne);
router.put("/:id", verifyToken, isAdminOrSuperAdmin, controller.update);
router.delete("/:id", verifyToken, isSuperAdmin, controller.remove);

module.exports = router;
