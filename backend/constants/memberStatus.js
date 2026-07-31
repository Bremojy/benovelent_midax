/**
 * ============================================================
 * BENEVOLENT MIDAX
 * MEMBER STATUS CONSTANTS
 * ============================================================
 *
 * These statuses determine whether a member can access
 * different parts of the system.
 */

const MEMBER_STATUS = Object.freeze({

    // ==========================================
    // ACTIVE MEMBER
    // ==========================================
    ACTIVE: "active",

    // ==========================================
    // MEMBER PENDING APPROVAL
    // ==========================================
    PENDING: "pending",

    // ==========================================
    // ACCOUNT SUSPENDED
    // ==========================================
    SUSPENDED: "suspended",

    // ==========================================
    // ACCOUNT DEACTIVATED
    // ==========================================
    INACTIVE: "inactive",

    // ==========================================
    // EXPELLED MEMBER
    // ==========================================
    TERMINATED: "terminated",

    // ==========================================
    // DECEASED MEMBER
    // ==========================================
    DECEASED: "deceased",

});

// ============================================================
// MEMBERS ALLOWED TO LOGIN
// ============================================================

const LOGIN_ALLOWED = [
    MEMBER_STATUS.ACTIVE,
];

// ============================================================
// MEMBERS ALLOWED TO CLAIM SUPPORT
// ============================================================

const SUPPORT_ALLOWED = [
    MEMBER_STATUS.ACTIVE,
];

// ============================================================
// MEMBERS ALLOWED TO VOTE
// ============================================================

const VOTING_ALLOWED = [
    MEMBER_STATUS.ACTIVE,
];

// ============================================================
// MEMBERS ALLOWED TO CONTRIBUTE
// ============================================================

const CONTRIBUTION_ALLOWED = [
    MEMBER_STATUS.ACTIVE,
];

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    MEMBER_STATUS,
    LOGIN_ALLOWED,
    SUPPORT_ALLOWED,
    VOTING_ALLOWED,
    CONTRIBUTION_ALLOWED,
};