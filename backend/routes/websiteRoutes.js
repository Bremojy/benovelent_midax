const express = require("express");
const router = express.Router();

const {
  getWebsiteContent,
  getWebsiteSettings,
  getWebsiteManagementContent,
  getGallery,
  getConstitution,
  getConstitutionManagement,
  restoreConstitutionVersion,
  uploadConstitutionFile,
  getSection,
  createSection,
  updateSection,
  deleteSection,
  uploadGalleryImage,
  updateGalleryItem,
  reorderGallery,
  archiveGalleryItem,
} = require("../controllers/websiteController");

const { verifyToken: protect } = require("../middleware/authMiddleware");
const { isSuperAdmin } = require("../middleware/roleMiddleware");
const { uploadSingle, setUploadType } = require("../middleware/upload");

// ==========================================
// WEBSITE ROUTES
// ==========================================

router.get("/", getWebsiteContent);
router.get("/settings", getWebsiteSettings);
router.get("/manage", protect, isSuperAdmin, getWebsiteManagementContent);
router.get("/gallery", getGallery);
router.get("/constitution/manage", protect, isSuperAdmin, getConstitutionManagement);
router.get("/constitution", getConstitution);

router.post("/gallery/upload", protect, isSuperAdmin, setUploadType("gallery"), uploadSingle("image"), uploadGalleryImage);
router.patch("/gallery/items/reorder", protect, isSuperAdmin, reorderGallery);
router.patch("/gallery/items/:itemId", protect, isSuperAdmin, updateGalleryItem);
router.delete("/gallery/items/:itemId", protect, isSuperAdmin, archiveGalleryItem);
router.post("/constitution/upload", protect, isSuperAdmin, setUploadType("documents"), uploadSingle("file"), uploadConstitutionFile);
router.post("/constitution/restore/:version", protect, isSuperAdmin, restoreConstitutionVersion);

// Get one section
router.get("/:section", getSection);

// Create new section (Admin/Super Admin)
router.post("/", protect, isSuperAdmin, createSection);

// Update website settings directly
router.put("/settings", protect, isSuperAdmin, (req, res) => {
  req.params.section = "settings";
  return updateSection(req, res);
});

// Update section
router.put("/:section", protect, isSuperAdmin, updateSection);

// Delete section
router.delete("/:section", protect, isSuperAdmin, deleteSection);

module.exports = router;
