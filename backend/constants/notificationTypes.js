/**
 * ============================================================
 * BENEVOLENT MIDAX
 * NOTIFICATION TYPES
 * ============================================================
 */

const NOTIFICATION_TYPES = Object.freeze({

    // =========================================================
    // AUTHENTICATION
    // =========================================================

    LOGIN: "login",
    LOGOUT: "logout",
    PASSWORD_CHANGED: "password_changed",
    PASSWORD_RESET: "password_reset",

    // =========================================================
    // MEMBER
    // =========================================================

    MEMBER_REGISTERED: "member_registered",
    MEMBER_APPROVED: "member_approved",
    MEMBER_REJECTED: "member_rejected",
    MEMBER_UPDATED: "member_updated",
    MEMBER_SUSPENDED: "member_suspended",
    MEMBER_REACTIVATED: "member_reactivated",
    MEMBER_DELETED: "member_deleted",

    // =========================================================
    // CONTRIBUTIONS
    // =========================================================

    CONTRIBUTION_RECEIVED: "contribution_received",
    CONTRIBUTION_OVERDUE: "contribution_overdue",
    CONTRIBUTION_REMINDER: "contribution_reminder",

    // =========================================================
    // CLAIMS & SUPPORT
    // =========================================================

    CLAIM_SUBMITTED: "claim_submitted",
    CLAIM_UNDER_REVIEW: "claim_under_review",
    CLAIM_DOCUMENT_REQUIRED: "claim_document_required",
    CLAIM_APPROVED: "claim_approved",
    CLAIM_REJECTED: "claim_rejected",
    CLAIM_PAID: "claim_paid",
    CLAIM_COMPLETED: "claim_completed",

    // =========================================================
    // MEDICAL
    // =========================================================

    MEDICAL_APPLICATION: "medical_application",

    // =========================================================
    // FUNERAL
    // =========================================================

    FUNERAL_APPLICATION: "funeral_application",

    // =========================================================
    // EDUCATION
    // =========================================================

    EDUCATION_APPLICATION: "education_application",

    // =========================================================
    // FINANCE
    // =========================================================

    PAYMENT_RECEIVED: "payment_received",
    PAYMENT_APPROVED: "payment_approved",
    PAYMENT_FAILED: "payment_failed",

    // =========================================================
    // WEBSITE
    // =========================================================

    NEWS_PUBLISHED: "news_published",
    EVENT_PUBLISHED: "event_published",
    CONSTITUTION_UPDATED: "constitution_updated",

    // =========================================================
    // CHAT
    // =========================================================

    NEW_MESSAGE: "new_message",

    // =========================================================
    // POLLS
    // =========================================================

    NEW_POLL: "new_poll",
    POLL_CLOSED: "poll_closed",

    // =========================================================
    // SYSTEM
    // =========================================================

    SYSTEM: "system",
    ANNOUNCEMENT: "announcement",
    WARNING: "warning",
    SUCCESS: "success",
    ERROR: "error",

});

// ============================================================
// DEFAULT TITLES
// ============================================================

const NOTIFICATION_TITLES = Object.freeze({

    login: "Login Successful",

    logout: "Logged Out",

    member_registered: "Registration Received",

    member_approved: "Membership Approved",

    member_rejected: "Membership Declined",

    contribution_received: "Contribution Received",

    contribution_overdue: "Contribution Overdue",

    contribution_reminder: "Contribution Reminder",

    claim_submitted: "Application Submitted",

    claim_under_review: "Application Under Review",

    claim_document_required: "Additional Documents Required",

    claim_approved: "Application Approved",

    claim_rejected: "Application Rejected",

    claim_paid: "Payment Processed",

    claim_completed: "Application Completed",

    payment_received: "Payment Received",

    payment_failed: "Payment Failed",

    new_message: "New Message",

    news_published: "News Published",

    new_poll: "New Poll Available",

    poll_closed: "Poll Closed",

    announcement: "Announcement",

    warning: "Important Notice",

    success: "Success",

    error: "System Error",

});

module.exports = {
    NOTIFICATION_TYPES,
    NOTIFICATION_TITLES,
};