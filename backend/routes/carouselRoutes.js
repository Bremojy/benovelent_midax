const express = require("express");
const path = require("path");
const fs = require("fs");

const Carousel = require("../models/Carousel");
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isSuperAdmin } = require("../middleware/roleMiddleware");

const router = express.Router();

const { uploadSingle, setUploadType } = require("../middleware/upload");

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

router.post("/upload", protect, isSuperAdmin, setUploadType("carousel"), uploadSingle("image"), async (req, res) => {
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

router.post("/", protect, isSuperAdmin, async (req, res) => {
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

router.put("/:id", protect, isSuperAdmin, setUploadType("carousel"), uploadSingle("image"), async (req, res) => {
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

router.delete("/:id", protect, isSuperAdmin, async (req, res) => {
    try {
        const slide = await Carousel.findByIdAndDelete(req.params.id);

        if (!slide) {
            return res.status(404).json({
                message: "Carousel slide not found",
            });
        }

        if (slide.imageUrl) {
            const { uploadRoot } = require("../config/uploadConfig");
            const imagePath = path.join(uploadRoot, slide.imageUrl.replace(/^\/+/, ""));

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