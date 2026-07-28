const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const roleAuth = require("../middleware/roleAuth");

const {
  getDashboard,
  getMembers,
  getMember,
  createMember,
  updateMember,
  deleteMember,
} = require("../controllers/adminController");

/* =====================================================
   DASHBOARD
===================================================== */

router.get(
  "/dashboard",
  auth,
  roleAuth("admin", "superadmin"),
  getDashboard
);

/* =====================================================
   MEMBERS
===================================================== */

// Get all members
router.get(
  "/members",
  auth,
  roleAuth("admin", "superadmin"),
  getMembers
);

// Get one member
router.get(
  "/members/:id",
  auth,
  roleAuth("admin", "superadmin"),
  getMember
);

// Add member
router.post(
  "/members",
  auth,
  roleAuth("admin", "superadmin"),
  createMember
);

// Update member
router.put(
  "/members/:id",
  auth,
  roleAuth("admin", "superadmin"),
  updateMember
);

// Delete member
router.delete(
  "/members/:id",
  auth,
  roleAuth("admin", "superadmin"),
  deleteMember
);

module.exports = router;