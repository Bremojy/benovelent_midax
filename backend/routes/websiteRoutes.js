const express = require("express");
const router = express.Router();

const {
  getWebsiteContent,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  uploadHeroImage,
  uploadGalleryImage,
  getWebsiteStatistics,
} = require("../controllers/websiteController");

const protect = require("../middleware/authMiddleware");

// ==========================================
// WEBSITE ROUTES
// ==========================================

// Public website content
router.get("/", getWebsiteContent);

// Website statistics
// Uncomment after getWebsiteStatistics exists
// router.get("/statistics", protect, getWebsiteStatistics);

// Get one section
router.get("/:section", getSection);

// Create new section (Admin/Super Admin)
router.post("/", protect, createSection);

// Update section
router.put("/:section", protect, updateSection);

// Delete section
router.delete("/:section", protect, deleteSection);

// Upload Hero Image
// Uncomment after uploadHeroImage exists
// router.post("/hero/upload", protect, uploadHeroImage);

// Upload Gallery Image
// Uncomment after uploadGalleryImage exists
// router.post("/gallery/upload", protect, uploadGalleryImage);

module.exports = router;