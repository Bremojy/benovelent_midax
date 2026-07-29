const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const protect = require("../middleware/authMiddleware");

const {
    getCarousel,
    uploadCarousel,
    deleteCarousel,
    toggleCarousel
} = require("../controllers/carouselController");

// ==============================
// LOCAL STORAGE
// ==============================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/carousel");
    },

    filename: (req, file, cb) => {
        cb(
            null,
            Date.now() +
                "-" +
                Math.round(Math.random() * 1e9) +
                path.extname(file.originalname)
        );
    }
});

const upload = multer({ storage });

// ==============================
// ROUTES
// ==============================

router.get("/", getCarousel);

router.post(
    "/upload",
    protect,
    upload.single("image"),
    uploadCarousel
);

router.delete("/:id", protect, deleteCarousel);

router.put("/:id", protect, toggleCarousel);

module.exports = router;