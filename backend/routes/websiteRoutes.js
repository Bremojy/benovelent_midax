const express = require("express");
const router = express.Router();

const {
  getWebsiteContent,
  getWebsiteSettings,
  getGallery,
  getConstitution,
  uploadConstitutionFile,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  uploadGalleryImage,
} = require("../controllers/websiteController");

const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isSuperAdmin } = require("../middleware/roleMiddleware");
const { uploadSingle, setUploadType } = require("../middleware/upload");

// ==========================================
// WEBSITE ROUTES
// ==========================================

router.get("/", getWebsiteContent);
router.get("/settings", getWebsiteSettings);
router.get("/gallery", getGallery);
router.get("/constitution", getConstitution);

router.post("/gallery/upload", protect, isSuperAdmin, setUploadType("gallery"), uploadSingle("image"), uploadGalleryImage);
router.post("/constitution/upload", protect, isSuperAdmin, setUploadType("documents"), uploadSingle("file"), uploadConstitutionFile);

// Get one section
router.get("/:section", getSection);

// Create new section (Admin/Super Admin)
router.post("/", protect, createSection);

// Update website settings directly
router.put("/settings", protect, (req, res) => {
  req.params.section = "settings";
  return updateSection(req, res);
});

// Update section
router.put("/:section", protect, updateSection);

// Delete section
router.delete("/:section", protect, deleteSection);

module.exports = router;
