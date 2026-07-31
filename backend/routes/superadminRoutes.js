const express = require("express");

const router = express.Router();

const {
  verifyToken: protect,
} = require("../middleware/authMiddleware");

const {
  isSuperAdmin,
} = require("../middleware/roleMiddleware");

const {
  createAdmin,
} = require("../controllers/superadminController");

// ==========================================
// SUPERADMIN
// ==========================================

router.post(
  "/create-admin",
  protect,
  isSuperAdmin,
  createAdmin
);

module.exports = router;