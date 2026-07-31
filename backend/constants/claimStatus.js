/**
 * ============================================================
 * BENEVOLENT MIDAX
 * CLAIM STATUS CONSTANTS
 * ============================================================
 *
 * Used by:
 * - Medical Support
 * - Funeral Support
 * - Education Support
 * - Emergency Support (Future)
 * - Finance
 * - Notifications
 * - Audit Logs
 */

const CLAIM_STATUS = Object.freeze({

    // =========================================================
    // Application has been submitted
    // =========================================================
    PENDING: "pending",

    // =========================================================
    // Application is under review
    // =========================================================
    UNDER_REVIEW: "under_review",

    // =========================================================
    // Additional documents required
    // =========================================================
    DOCUMENT_REQUIRED: "document_required",

    // =========================================================
    // Approved by Admin
    // =========================================================
    APPROVED: "approved",

    // =========================================================
    // Rejected
    // =========================================================
    REJECTED: "rejected",

    // =========================================================
    // Payment has been processed
    // =========================================================
    PAID: "paid",

    // =========================================================
    // Claim has been completed
    // =========================================================
    COMPLETED: "completed",

    // =========================================================
    // Cancelled by member/admin
    // =========================================================
    CANCELLED: "cancelled",

});

// ============================================================
// CLAIMS THAT REQUIRE ADMIN ACTION
// ============================================================

const PENDING_ACTION = [
    CLAIM_STATUS.PENDING,
    CLAIM_STATUS.UNDER_REVIEW,
    CLAIM_STATUS.DOCUMENT_REQUIRED,
];

// ============================================================
// CLAIMS THAT CAN STILL BE MODIFIED
// ============================================================

const EDITABLE_STATUS = [
    CLAIM_STATUS.PENDING,
    CLAIM_STATUS.DOCUMENT_REQUIRED,
];

// ============================================================
// FINAL STATUSES
// ============================================================

const FINAL_STATUS = [
    CLAIM_STATUS.APPROVED,
    CLAIM_STATUS.REJECTED,
    CLAIM_STATUS.COMPLETED,
    CLAIM_STATUS.CANCELLED,
];

// ============================================================
// CLAIMS ELIGIBLE FOR PAYMENT
// ============================================================

const PAYMENT_ALLOWED = [
    CLAIM_STATUS.APPROVED,
];

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    CLAIM_STATUS,
    PENDING_ACTION,
    EDITABLE_STATUS,
    FINAL_STATUS,
    PAYMENT_ALLOWED,
};