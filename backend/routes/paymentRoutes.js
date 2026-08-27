const express = require("express");
const router = express.Router();
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isMember, isAdminOrSuperAdmin, isSuperAdmin } = require("../middleware/roleMiddleware");
const controller = require("../controllers/paymentController");

router.get("/route-status", controller.routeStatus);
router.get("/public-config", controller.publicConfig);
router.get("/config", protect, controller.config);
router.get("/mine", protect, controller.myTransactions);
router.get("/transactions/:id", protect, isMember, controller.getTransaction);
router.post("/stk", protect, isMember, controller.stk);
router.post("/stk-query", protect, isMember, controller.stkQuery);
// Backward-compatible aliases for older deployed/mobile clients.
router.post("/stkpush", protect, isMember, controller.stk);
router.post("/mpesa-stk", protect, isMember, controller.stk);
router.get("/callback", controller.callbackHealth);
router.post("/callback", controller.callback);
router.post("/b2c/result", controller.b2cResult);
router.post("/b2c/timeout", controller.b2cTimeout);
router.get("/b2c/history", protect, isSuperAdmin, controller.b2cHistory);
router.post("/b2c/disburse", protect, isSuperAdmin, controller.disburseB2C);

router.get("/community-assistance", protect, isMember, controller.communityCases);
router.get("/community-assistance/admin", protect, isAdminOrSuperAdmin, controller.communityCases);
router.get("/community-assistance/mine", protect, controller.myCommunityCases);
router.post("/community-assistance", protect, isAdminOrSuperAdmin, controller.enableCommunityAssistance);
router.post("/community-assistance/:id/payout", protect, isSuperAdmin, controller.payoutCommunity);
router.post("/community-assistance/:id/close", protect, isSuperAdmin, controller.closeCommunity);

module.exports = router;
