const express = require("express");
const router = express.Router();

const {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  rejectTransaction,
  getMemberTransactions,
  getFinanceSummary,
  getLedger,
  hideTransaction,
} = require("../controllers/financeController");

const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isAdminOrSuperAdmin, isMember, isSuperAdmin } = require("../middleware/roleMiddleware");

// ==========================================
// FINANCE ROUTES
// ==========================================

// Create a transaction (Admin / Super Admin)
router.post("/", protect, isAdminOrSuperAdmin, createTransaction);

// Get all transactions
router.get("/", protect, isAdminOrSuperAdmin, getTransactions);

// Finance dashboard summary
router.get("/ledger", protect, getLedger);
router.get("/summary/dashboard", protect, isAdminOrSuperAdmin, getFinanceSummary);

// Get member transaction history
router.get("/member/:memberId", protect, getMemberTransactions);

// Get single transaction
router.get("/:id", protect, getTransaction);

// Update transaction
router.put("/:id", protect, isAdminOrSuperAdmin, updateTransaction);

// Delete transaction
router.delete("/:id", protect, isSuperAdmin, deleteTransaction);
router.patch("/:id/visibility", protect, isSuperAdmin, hideTransaction);

// Approve transaction
router.put("/:id/approve", protect, isAdminOrSuperAdmin, approveTransaction);

// Reject transaction
router.put("/:id/reject", protect, isAdminOrSuperAdmin, rejectTransaction);

module.exports = router;