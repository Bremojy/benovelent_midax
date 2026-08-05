const express = require("express");
const router = express.Router();
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isAdminOrSuperAdmin } = require("../middleware/roleMiddleware");
const { createContactMessage, getContactMessages, updateContactMessage, deleteContactMessage } = require("../controllers/contactController");

router.post("/", createContactMessage);
router.get("/", protect, isAdminOrSuperAdmin, getContactMessages);
router.patch("/:id", protect, isAdminOrSuperAdmin, updateContactMessage);
router.delete("/:id", protect, isAdminOrSuperAdmin, deleteContactMessage);

module.exports = router;
