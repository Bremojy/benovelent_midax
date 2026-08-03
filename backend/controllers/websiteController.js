const fs = require("fs");
const path = require("path");
const WebsiteContent = require("../models/WebsiteContent");

const DEFAULT_SECTIONS = ["home", "about", "services", "contact", "footer", "settings", "gallery"];

async function findOrCreateSection(section, defaults = {}) {
    let record = await WebsiteContent.findOne({ section });

    if (!record) {
        record = await WebsiteContent.create({
            section,
            title: defaults.title || "",
            subtitle: defaults.subtitle || "",
            description: defaults.description || "",
            content: defaults.content || {},
            images: defaults.images || [],
            published: defaults.published !== false,
            updatedBy: defaults.updatedBy,
        });
    }

    return record;
}

/* =====================================================
   GET ALL WEBSITE CONTENT
===================================================== */

exports.getWebsiteContent = async (req, res) => {
    try {
        const content = await WebsiteContent.find().sort({ section: 1 }).lean();

        res.json({ success: true, count: content.length, content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   GET WEBSITE SETTINGS
===================================================== */

exports.getWebsiteSettings = async (req, res) => {
    try {
        const section = await findOrCreateSection("settings", {
            title: "Website Settings",
            subtitle: "Brand color and public website preferences",
            description: "Managed by the superadmin portal.",
            content: { themeColor: "#ff7a00", accentColor: "#ff7a00" },
            images: [],
        });

        res.json({ success: true, section, settings: section.content || {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   GET GALLERY
===================================================== */

exports.getGallery = async (req, res) => {
    try {
        const section = await findOrCreateSection("gallery", {
            title: "Gallery",
            subtitle: "Community moments",
            description: "A growing collection of public moments from Benevolent Midax.",
            content: {},
            images: [],
        });

        res.json({
            success: true,
            section,
            gallery: section.images || [],
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   UPLOAD GALLERY IMAGE
===================================================== */

exports.uploadGalleryImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please choose an image to upload." });
        }

        const section = await findOrCreateSection("gallery", {
            title: "Gallery",
            subtitle: "Community moments",
            description: "A growing collection of public moments from Benevolent Midax.",
            content: {},
            images: [],
        });

        const imageUrl = `/uploads/${req.uploadType || "gallery"}/${req.file.filename}`;

        section.images = Array.from(new Set([...(section.images || []), imageUrl]));

        if (req.body.title?.trim() && !section.title) section.title = req.body.title.trim();
        if (req.body.subtitle?.trim() && !section.subtitle) section.subtitle = req.body.subtitle.trim();
        if (req.body.description?.trim() && !section.description) section.description = req.body.description.trim();

        section.content = {
            ...(typeof section.content === "object" && section.content ? section.content : {}),
            ...(req.body.caption ? { lastCaption: req.body.caption.trim() } : {}),
            lastUploadAt: new Date().toISOString(),
        };
        section.updatedBy = req.user?._id;

        await section.save();

        res.status(201).json({
            success: true,
            message: "Gallery image uploaded successfully.",
            section,
            imageUrl,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   GET SINGLE SECTION
===================================================== */

exports.getSection = async (req, res) => {
    try {
        const section = await WebsiteContent.findOne({ section: req.params.section }).lean();

        if (!section) {
            return res.status(404).json({ success: false, message: "Section not found." });
        }

        res.json({ success: true, section });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   CREATE SECTION
===================================================== */

exports.createSection = async (req, res) => {
    try {
        const existing = await WebsiteContent.findOne({ section: req.body.section });

        if (existing) {
            return res.status(400).json({ success: false, message: "Section already exists." });
        }

        const section = await WebsiteContent.create({ ...req.body, updatedBy: req.user._id });

        res.status(201).json({ success: true, message: "Section created successfully.", section });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   UPDATE SECTION
===================================================== */

exports.updateSection = async (req, res) => {
    try {
        const section = await WebsiteContent.findOne({ section: req.params.section });

        if (!section) {
            return res.status(404).json({ success: false, message: "Section not found." });
        }

        section.title = req.body.title ?? section.title;
        section.subtitle = req.body.subtitle ?? section.subtitle;
        section.description = req.body.description ?? section.description;

        if (req.params.section === "settings") {
            section.content = {
                ...(typeof section.content === "object" && section.content ? section.content : {}),
                ...(typeof req.body.content === "object" && req.body.content ? req.body.content : {}),
            };
        } else {
            section.content = req.body.content ?? section.content;
        }

        section.images = req.body.images ?? section.images;

        if (typeof req.body.published === "boolean") {
            section.published = req.body.published;
        }

        section.updatedBy = req.user._id;

        await section.save();

        res.json({ success: true, message: "Website updated successfully.", section });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   DELETE SECTION
===================================================== */

exports.deleteSection = async (req, res) => {
    try {
        const section = await WebsiteContent.findOneAndDelete({ section: req.params.section });

        if (!section) {
            return res.status(404).json({ success: false, message: "Section not found." });
        }

        res.json({ success: true, message: "Section deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   INITIALIZE WEBSITE
===================================================== */

exports.initializeWebsite = async (req, res) => {
    try {
        for (const section of DEFAULT_SECTIONS) {
            const exists = await WebsiteContent.findOne({ section });
            if (!exists) {
                await WebsiteContent.create({ section, title: "", subtitle: "", description: "", content: {}, images: [], updatedBy: req.user._id });
            }
        }

        res.json({ success: true, message: "Website initialized successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
