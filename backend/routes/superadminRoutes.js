const express = require("express");

const router = express.Router();

const protect = require("../middleware/authMiddleware");

const authorize = require("../middleware/roleMiddleware");

const {
    createAdmin
} = require("../controllers/superadminController");

router.post(
    "/create-admin",
    protect,
    authorize("superadmin"),
    createAdmin
);

module.exports = router;