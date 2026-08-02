const express = require("express");
const router = express.Router();
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { createContactMessage, getContactMessages, updateContactMessage } = require("../controllers/contactController");

router.post("/", createContactMessage);
router.get("/", protect, getContactMessages);
router.patch("/:id", protect, updateContactMessage);

module.exports = router;
