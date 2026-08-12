const express = require("express");
const Carousel = require("../models/Carousel");
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isSuperAdmin } = require("../middleware/roleMiddleware");
const { uploadSingle, setUploadType } = require("../middleware/upload");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    const slides = await Carousel.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json(slides);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch carousel slides", error: error.message });
  }
});

router.get("/active", async (req, res) => {
  try {
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    const slides = await Carousel.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();
    res.json(slides);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch active slides", error: error.message });
  }
});

router.post("/upload", protect, isSuperAdmin, setUploadType("carousel"), uploadSingle("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please select an image" });
    }

    const { title, description, buttonText, buttonLink, order } = req.body;
    const normalizedTitle = String(title || "Benevolent Midax").trim();
    const normalizedDescription = String(description || "").trim();
    const imageUrl = resolveStoredFileUrl(req.file, "/uploads/carousel");
    const contentHash = String(req.file.contentHash || "");

    const duplicate = await Carousel.findOne({
      $or: [
        ...(contentHash ? [{ contentHash }] : []),
        { imageUrl, title: normalizedTitle, description: normalizedDescription },
      ],
    }).lean();

    if (duplicate) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_CAROUSEL",
        message: "This carousel image/content already exists. Use the existing slide instead of creating a duplicate.",
        slide: duplicate,
      });
    }

    const slide = await Carousel.create({
      imageUrl,
      contentHash,
      title: normalizedTitle,
      description: normalizedDescription,
      buttonText: buttonText || "Discover More",
      buttonLink: buttonLink || "/about",
      order: Number(order) || 0,
      isActive: true,
    });

    res.status(201).json({ message: "Carousel image uploaded successfully", slide });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

router.post("/", protect, isSuperAdmin, async (req, res) => {
  try {
    const { imageUrl, title, description, buttonText, buttonLink, order } = req.body;
    if (!imageUrl || !title) {
      return res.status(400).json({ message: "Image URL and title are required" });
    }

    const slide = await Carousel.create({
      imageUrl,
      contentHash: "",
      title,
      description,
      buttonText,
      buttonLink,
      order: Number(order) || 0,
      isActive: true,
    });

    res.status(201).json({ message: "Carousel slide created successfully", slide });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create carousel slide", error: error.message });
  }
});

router.put("/:id", protect, isSuperAdmin, setUploadType("carousel"), uploadSingle("image"), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.imageUrl = resolveStoredFileUrl(req.file, "/uploads/carousel");
    }
    if (updateData.order !== undefined) {
      updateData.order = Number(updateData.order) || 0;
    }

    const slide = await Carousel.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!slide) {
      return res.status(404).json({ message: "Carousel slide not found" });
    }

    res.json({ message: "Carousel updated successfully", slide });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update carousel", error: error.message });
  }
});

router.delete("/:id", protect, isSuperAdmin, async (req, res) => {
  try {
    const slide = await Carousel.findByIdAndDelete(req.params.id);
    if (!slide) {
      return res.status(404).json({ message: "Carousel slide not found" });
    }

    res.json({ message: "Carousel deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete carousel", error: error.message });
  }
});

module.exports = router;
