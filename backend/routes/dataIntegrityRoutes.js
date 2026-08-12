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
    printDatabaseDetails,
    cleanupSelfConversations,
    cleanupOrphanedChatData,
    removeLegacyMemberIncome,
    getCollectionInventory,
} = require("../controllers/dataIntegrityController");

const router = express.Router();

router.use(protect, superAdmin);

router.get("/", getIntegrityReport);
router.get("/backup", downloadDatabaseBackup);
router.get("/print-database", printDatabaseDetails);
router.post("/cleanup", runSafeCleanup);
router.post("/cleanup/carousels", cleanupCarouselDuplicates);
router.post("/cleanup/carousels/deep", deepScanCarouselDuplicates);
router.post("/cleanup/self-conversations", cleanupSelfConversations);
router.post("/cleanup/orphans", cleanupOrphanedChatData);
router.post("/cleanup/member-income", removeLegacyMemberIncome);
router.get("/collections", getCollectionInventory);
router.delete("/members/:id", deleteDuplicateMember);

module.exports = router;
