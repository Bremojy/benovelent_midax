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
} = require("../controllers/financeController");

const protect = require("../middleware/authMiddleware");

// ==========================================
// FINANCE ROUTES
// ==========================================

// Create a transaction (Admin / Super Admin)
router.post("/", protect, createTransaction);

// Get all transactions
router.get("/", protect, getTransactions);

// Finance dashboard summary
router.get("/summary/dashboard", protect, getFinanceSummary);

// Get member transaction history
router.get("/member/:memberId", protect, getMemberTransactions);

// Get single transaction
router.get("/:id", protect, getTransaction);

// Update transaction
router.put("/:id", protect, updateTransaction);

// Delete transaction
router.delete("/:id", protect, deleteTransaction);

// Approve transaction
router.put("/:id/approve", protect, approveTransaction);

// Reject transaction
router.put("/:id/reject", protect, rejectTransaction);

module.exports = router;