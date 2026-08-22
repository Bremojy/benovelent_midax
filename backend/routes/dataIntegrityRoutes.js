const express = require("express");
const { verifyToken: protect } = require("../middleware/authMiddleware");
const superAdmin = require("../middleware/superAdminMiddleware");
const {
    getIntegrityReport,
    runSafeCleanup,
    cleanupCarouselDuplicates,
    deepScanCarouselDuplicates,
    deleteDuplicateMember,
    downloadDatabaseBackup,
    downloadHumanBackup,
    printHumanBackup,
    printDatabaseDetails,
    cleanupSelfConversations,
    cleanupOrphanedChatData,
    removeLegacyMemberIncome,
    getCollectionInventory,
    getDuplicateMemberPreview,
    getMemberReconciliation,
} = require("../controllers/dataIntegrityController");

const router = express.Router();

router.use(protect, superAdmin);

router.get("/", getIntegrityReport);
router.get("/backup", downloadDatabaseBackup);
router.get("/backup/human", downloadHumanBackup);
router.get("/backup/human/print", printHumanBackup);
router.get("/print-database", printDatabaseDetails);
router.post("/cleanup", runSafeCleanup);
router.post("/cleanup/carousels", cleanupCarouselDuplicates);
router.post("/cleanup/carousels/deep", deepScanCarouselDuplicates);
router.post("/cleanup/self-conversations", cleanupSelfConversations);
router.post("/cleanup/orphans", cleanupOrphanedChatData);
router.post("/cleanup/member-income", removeLegacyMemberIncome);
router.get("/collections", getCollectionInventory);
router.get("/members-reconciliation", getMemberReconciliation);
// Protected preview endpoint. Browsers must call this through the authenticated
// frontend client; direct address-bar access intentionally returns TOKEN_MISSING.
router.get("/members/:id", getDuplicateMemberPreview);
router.delete("/members/:id", deleteDuplicateMember);

module.exports = router;
