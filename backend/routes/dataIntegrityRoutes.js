const express = require("express");
const { verifyToken: protect } = require("../middleware/authMiddleware");
const superAdmin = require("../middleware/superAdminMiddleware");
const {
    getIntegrityReport,
    runSafeCleanup,
    deleteDuplicateMember,
} = require("../controllers/dataIntegrityController");

const router = express.Router();

router.use(protect, superAdmin);

router.get("/", getIntegrityReport);
router.post("/cleanup", runSafeCleanup);
router.delete("/members/:id", deleteDuplicateMember);

module.exports = router;
