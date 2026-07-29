const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const Leader = require("../models/Leader");

const router = express.Router();

// ========================================
// CREATE UPLOAD FOLDER IF IT DOESN'T EXIST
// ========================================

const uploadPath = path.join(__dirname, "../uploads/leaders");

if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

// ========================================
// MULTER STORAGE
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
// GET ALL LEADERS
// ========================================

router.get("/", async (req, res) => {
    try {
        const leaders = await Leader.find().sort({
            order: 1,
            createdAt: -1,
        });

        res.json(leaders);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch leaders",
            error: error.message,
        });
    }
});

// ========================================
// GET ACTIVE LEADERS
// ========================================

router.get("/active", async (req, res) => {
    try {
        const leaders = await Leader.find({
            isActive: true,
        }).sort({
            order: 1,
        });

        res.json(leaders);
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch active leaders",
            error: error.message,
        });
    }
});

// ========================================
// ADD LEADER
// ========================================

router.post("/upload", upload.single("image"), async (req, res) => {
    try {
        const { name, position, bio, order } = req.body;

        if (!name || !position) {
            return res.status(400).json({
                message: "Name and position are required",
            });
        }

        const leader = await Leader.create({
            name,
            position,
            bio: bio || "",
            imageUrl: req.file
                ? `/uploads/leaders/${req.file.filename}`
                : "",
            order: Number(order) || 0,
            isActive: true,
        });

        res.status(201).json({
            message: "Leader added successfully",
            leader,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to add leader",
            error: error.message,
        });
    }
});

// ========================================
// UPDATE LEADER
// ========================================

router.put("/:id", upload.single("image"), async (req, res) => {
    try {
        const updateData = {
            ...req.body,
        };

        if (req.file) {
            updateData.imageUrl = `/uploads/leaders/${req.file.filename}`;
        }

        if (updateData.order) {
            updateData.order = Number(updateData.order);
        }

        const leader = await Leader.findByIdAndUpdate(
            req.params.id,
            updateData,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!leader) {
            return res.status(404).json({
                message: "Leader not found",
            });
        }

        res.json({
            message: "Leader updated successfully",
            leader,
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update leader",
            error: error.message,
        });
    }
});

// ========================================
// DELETE LEADER
// ========================================

router.delete("/:id", async (req, res) => {
    try {
        const leader = await Leader.findByIdAndDelete(req.params.id);

        if (!leader) {
            return res.status(404).json({
                message: "Leader not found",
            });
        }

        // Delete image from uploads folder
        if (leader.imageUrl) {
            const imagePath = path.join(
                __dirname,
                "..",
                leader.imageUrl.replace(/^\/+/, "")
            );

            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.json({
            message: "Leader deleted successfully",
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete leader",
            error: error.message,
        });
    }
});

module.exports = router;