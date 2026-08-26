const express = require("express");
const Leader = require("../models/Leader");
const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isSuperAdmin } = require("../middleware/roleMiddleware");
const { uploadSingle, setUploadType } = require("../middleware/upload");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");
const redisCache = require("../services/redisCache");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const cacheKey = "public:leaders:all";
    const cached = await redisCache.getJson(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
      return res.json(cached);
    }
    const leaders = await Leader.find().sort({ order: 1, createdAt: -1 }).lean();
    await redisCache.setJson(cacheKey, leaders, 300);
    res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    res.json(leaders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch leaders", error: error.message });
  }
});

router.get("/active", async (req, res) => {
  try {
    const cacheKey = "public:leaders:active";
    const cached = await redisCache.getJson(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
      return res.json(cached);
    }
    const leaders = await Leader.find({ isActive: true }).sort({ order: 1, createdAt: -1 }).lean();
    await redisCache.setJson(cacheKey, leaders, 300);
    res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
    res.json(leaders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch active leaders", error: error.message });
  }
});

router.post("/upload", protect, isSuperAdmin, setUploadType("leaders"), uploadSingle("image"), async (req, res) => {
  try {
    const { name, position, bio, order } = req.body;
    if (!name || !position) {
      return res.status(400).json({ message: "Name and position are required" });
    }

    const leader = await Leader.create({
      name,
      position,
      bio: bio || "",
      imageUrl: resolveStoredFileUrl(req.file, "/uploads/leaders"),
      order: Number(order) || 0,
      isActive: true,
    });

    await redisCache.invalidateMany(["public:leaders:all", "public:leaders:active"]);
    res.status(201).json({ message: "Leader added successfully", leader });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add leader", error: error.message });
  }
});

router.put("/:id", protect, isSuperAdmin, setUploadType("leaders"), uploadSingle("image"), async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.imageUrl = resolveStoredFileUrl(req.file, "/uploads/leaders");
    }
    if (updateData.order !== undefined) {
      updateData.order = Number(updateData.order) || 0;
    }

    const leader = await Leader.findByIdAndUpdate(req.params.id, updateData, { returnDocument: "after", runValidators: true });
    if (!leader) {
      return res.status(404).json({ message: "Leader not found" });
    }

    await redisCache.invalidateMany(["public:leaders:all", "public:leaders:active"]);
    res.json({ message: "Leader updated successfully", leader });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update leader", error: error.message });
  }
});

router.delete("/:id", protect, isSuperAdmin, async (req, res) => {
  try {
    const leader = await Leader.findByIdAndDelete(req.params.id);
    if (!leader) {
      return res.status(404).json({ message: "Leader not found" });
    }

    await redisCache.invalidateMany(["public:leaders:all", "public:leaders:active"]);
    res.json({ message: "Leader deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete leader", error: error.message });
  }
});

module.exports = router;
