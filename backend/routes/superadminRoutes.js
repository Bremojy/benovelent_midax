const express = require("express");

const router =
  express.Router();

const {
  verifyToken: protect,
} = require("../middleware/authMiddleware");

const {
  isSuperAdmin,
} = require("../middleware/roleMiddleware");

const {
  createAdmin,
  getAdmins,
  getAdmin,
  updateAdmin,
  suspendAdmin,
  activateAdmin,
  resetAdminPassword,
  deleteAdmin,
  getAdminStatistics,
} = require("../controllers/superadminController");


// ======================================================
// SUPERADMIN PROTECTION
// ======================================================

router.use(
  protect,
  isSuperAdmin
);


// ======================================================
// ADMIN STATISTICS
// GET /api/superadmin/admins/statistics
// ======================================================

router.get(
  "/admins/statistics",
  getAdminStatistics
);


// ======================================================
// GET ALL ADMINS
// GET /api/superadmin/admins
// ======================================================

router.get(
  "/admins",
  getAdmins
);


// ======================================================
// CREATE ADMIN
// POST /api/superadmin/admins
// ======================================================

router.post(
  "/admins",
  createAdmin
);


// ======================================================
// GET SINGLE ADMIN
// GET /api/superadmin/admins/:id
// ======================================================

router.get(
  "/admins/:id",
  getAdmin
);


// ======================================================
// UPDATE ADMIN
// PUT /api/superadmin/admins/:id
// ======================================================

router.put(
  "/admins/:id",
  updateAdmin
);


// ======================================================
// SUSPEND ADMIN
// PATCH /api/superadmin/admins/:id/suspend
// ======================================================

router.patch(
  "/admins/:id/suspend",
  suspendAdmin
);


// ======================================================
// ACTIVATE ADMIN
// PATCH /api/superadmin/admins/:id/activate
// ======================================================

router.patch(
  "/admins/:id/activate",
  activateAdmin
);


// ======================================================
// RESET PASSWORD
// PATCH /api/superadmin/admins/:id/reset-password
// ======================================================

router.patch(
  "/admins/:id/reset-password",
  resetAdminPassword
);


// ======================================================
// DELETE ADMIN
// DELETE /api/superadmin/admins/:id
// ======================================================

router.delete(
  "/admins/:id",
  deleteAdmin
);


module.exports = router;