const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Carousel = require("../models/Carousel");

const router = express.Router();

// ========================================
// CREATE UPLOAD FOLDER IF IT DOESN'T EXIST
// ========================================

const uploadPath = path.join(__dirname, "../uploads/carousel");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// ========================================
// MULTER CONFIGURATION
// ========================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
        cb(
            null,
            Date.now() +
                "-" +
                Math.round(Math.random() * 1000000) +
                path.extname(file.originalname)
        );
    },
});

const upload = multer({ storage });

// ========================================
// GET ALL CAROUSEL SLIDES
// ========================================

router.get("/", async (req, res) => {
    try {
        const slides = await Carousel.find().sort({
            order: 1,
            createdAt: -1,
        });

        res.json(slides);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch carousel slides",
            error: error.message,
        });
    }
});

// ========================================
// GET ACTIVE CAROUSEL SLIDES
// ========================================

router.get("/active", async (req, res) => {
    try {
        const slides = await Carousel.find({
            isActive: true,
        }).sort({
            order: 1,
            createdAt: -1,
        });

        res.json(slides);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch active slides",
            error: error.message,
        });
    }
});

// ========================================
// UPLOAD CAROUSEL IMAGE
// ========================================

router.post("/upload", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Please select an image",
            });
        }

        const {
            title,
            description,
            buttonText,
            buttonLink,
            order,
        } = req.body;

        const slide = await Carousel.create({
            imageUrl: `/uploads/carousel/${req.file.filename}`,
            title: title || "Benevolent Midax",
            description: description || "",
            buttonText: buttonText || "Discover More",
            buttonLink: buttonLink || "/about",
            order: Number(order) || 0,
            isActive: true,
        });

        res.status(201).json({
            message: "Carousel image uploaded successfully",
            slide,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Upload failed",
            error: error.message,
        });
    }
});

// ========================================
// CREATE CAROUSEL USING IMAGE URL
// ========================================

router.post("/", async (req, res) => {
    try {
        const {
            imageUrl,
            title,
            description,
            buttonText,
            buttonLink,
            order,
        } = req.body;

        if (!imageUrl || !title) {
            return res.status(400).json({
                message: "Image URL and title are required",
            });
        }

        const slide = await Carousel.create({
            imageUrl,
            title,
            description,
            buttonText,
            buttonLink,
            order: Number(order) || 0,
            isActive: true,
        });

        res.status(201).json({
            message: "Carousel slide created successfully",
            slide,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to create carousel slide",
            error: error.message,
        });
    }
});

// ========================================
// UPDATE CAROUSEL
// ========================================

router.put("/:id", upload.single("image"), async (req, res) => {
    try {
        const updateData = {
            ...req.body,
        };

        if (req.file) {
            updateData.imageUrl = `/uploads/carousel/${req.file.filename}`;
        }

        if (updateData.order) {
            updateData.order = Number(updateData.order);
        }

        const slide = await Carousel.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!slide) {
            return res.status(404).json({
                message: "Carousel slide not found",
            });
        }

        res.json({
            message: "Carousel updated successfully",
            slide,
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update carousel",
            error: error.message,
        });
    }
});

// ========================================
// DELETE CAROUSEL
// ========================================

router.delete("/:id", async (req, res) => {
    try {
        const slide = await Carousel.findByIdAndDelete(req.params.id);

        if (!slide) {
            return res.status(404).json({
                message: "Carousel slide not found",
            });
        }

        if (slide.imageUrl) {
            const imagePath = path.join(
                __dirname,
                "..",
                slide.imageUrl.replace(/^\/+/, "")
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.json({
            message: "Carousel deleted successfully",
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete carousel",
            error: error.message,
        });
    }
});

module.exports = router;