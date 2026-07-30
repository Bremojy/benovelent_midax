const express = require("express");

const router = express.Router();

const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/roleMiddleware");

const {
  getDashboard,
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
} = require("../controllers/adminController");

// =======================================
// DASHBOARD
// =======================================

router.get(
  "/dashboard",
  protect,
  isAdmin,
  getDashboard
);

// =======================================
// MEMBERS
// =======================================

router.get(
  "/members",
  protect,
  isAdmin,
  getMembers
);

router.get(
  "/members/:id",
  protect,
  isAdmin,
  getMember
);

router.post(
  "/members",
  protect,
  isAdmin,
  createMember
);

router.put(
  "/members/:id",
  protect,
  isAdmin,
  updateMember
);

router.delete(
  "/members/:id",
  protect,
  isAdmin,
  deleteMember
);

module.exports = router;