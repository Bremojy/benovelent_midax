const express = require("express");
const { verifyToken: protect } = require("../middleware/authMiddleware");
const superAdmin = require("../middleware/superAdminMiddleware");
const {
    getIntegrityReport,
    runSafeCleanup,
    cleanupCarouselDuplicates,
    deleteDuplicateMember,
    downloadDatabaseBackup,
} = require("../controllers/dataIntegrityController");

const router = express.Router();

router.use(protect, superAdmin);

router.get("/", getIntegrityReport);
router.get("/backup", downloadDatabaseBackup);
router.post("/cleanup", runSafeCleanup);
router.post("/cleanup/carousels", cleanupCarouselDuplicates);
router.delete("/members/:id", deleteDuplicateMember);

module.exports = router;
