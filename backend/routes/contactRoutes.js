const express = require("express");
const router = express.Router();
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isAdminOrSuperAdmin } = require("../middleware/roleMiddleware");
const { createContactMessage, getContactMessages, updateContactMessage, archiveContactMessage, replyContactMessage } = require("../controllers/contactController");

router.post("/", createContactMessage);
router.get("/", protect, isAdminOrSuperAdmin, getContactMessages);
router.patch("/:id", protect, isAdminOrSuperAdmin, updateContactMessage);
router.post("/:id/reply", protect, isAdminOrSuperAdmin, replyContactMessage);
router.delete("/:id", protect, isAdminOrSuperAdmin, archiveContactMessage);

module.exports = router;
