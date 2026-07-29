const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const {
  getDashboard,
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
} = require("../controllers/adminController");

// ===============================
// DASHBOARD
// ===============================
router.get(
  "/dashboard",
  protect,
  authorize("admin", "superadmin"),
  getDashboard
);

// ===============================
// MEMBERS
// ===============================
router.get(
  "/members",
  protect,
  authorize("admin", "superadmin"),
  getMembers
);

router.get(
  "/members/:id",
  protect,
  authorize("admin", "superadmin"),
  getMember
);

router.post(
  "/members",
  protect,
  authorize("admin", "superadmin"),
  createMember
);

router.put(
  "/members/:id",
  protect,
  authorize("admin", "superadmin"),
  updateMember
);

router.delete(
  "/members/:id",
  protect,
  authorize("admin", "superadmin"),
  deleteMember
);

module.exports = router;