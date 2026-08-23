const express = require("express");
const router = express.Router();
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isSuperAdmin } = require("../middleware/roleMiddleware");
const controller = require("../controllers/policyController");

router.get("/public", controller.publicList);
router.get("/", protect, controller.publicList);
router.get("/admin", protect, isSuperAdmin, controller.list);
router.post("/", protect, isSuperAdmin, controller.create);
router.put("/:id", protect, isSuperAdmin, controller.update);
router.delete("/:id", protect, isSuperAdmin, controller.remove);

module.exports = router;
