const express = require("express");
const router = express.Router();
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isMember, isAdminOrSuperAdmin } = require("../middleware/roleMiddleware");
const controller = require("../controllers/paymentController");

router.get("/config", protect, controller.config);
router.get("/mine", protect, controller.myTransactions);
router.get("/transactions/:id", protect, isMember, controller.getTransaction);
router.post("/stk", protect, isMember, controller.stk);
router.post("/callback", controller.callback);
router.post("/b2c/result", controller.b2cResult);
router.post("/b2c/timeout", controller.b2cTimeout);

router.get("/community-assistance", protect, isMember, controller.communityCases);
router.get("/community-assistance/admin", protect, isAdminOrSuperAdmin, controller.communityCases);
router.get("/community-assistance/mine", protect, controller.myCommunityCases);
router.post("/community-assistance", protect, isAdminOrSuperAdmin, controller.enableCommunityAssistance);
router.post("/community-assistance/:id/payout", protect, isAdminOrSuperAdmin, controller.payoutCommunity);

module.exports = router;
