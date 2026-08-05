const fs = require("fs");
const path = require("path");
const WebsiteContent = require("../models/WebsiteContent");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");

const DEFAULT_SECTIONS = ["home", "about", "services", "contact", "footer", "settings", "gallery", "constitution", "privacy-policy", "terms-conditions"];

const SECTION_DEFAULTS = {
    "privacy-policy": {
        title: "Privacy Policy",
        subtitle: "How we protect member data",
        description: "A clear privacy statement for the Benevolent Midax public website and portals.",
        content: {
            overview: "This website supports members, enhances communication and protects privacy in line with the Benevolent Fund Scheme's purpose and governance.",
            confidentiality: "Member information, support requests, dependants and portal activity are protected and should only be accessed by authorised administrators and the member concerned.",
            access: "The superAdmin controls administrative access and can review or edit member records where authorised by the portal role.",
            updates: "The superadmin can update this page when policy language changes, while scheme decisions remain governed by the constitution and committee processes.",
        },
    },
    "terms-conditions": {
        title: "Terms & Conditions",
        subtitle: "The rules for using the portal",
        description: "Guidelines for members, administrators and visitors using the Benevolent Midax website.",
        content: {
            overview: "Use the website and portals responsibly, keep login details private and follow the Benevolent Fund Scheme constitution and approved procedures.",
            support: "Funeral and medical support is subject to the constitutional eligibility, claim limits, documentation and approval process.",
            communication: "Use portal chat, polls and support tools respectfully. Do not misuse another member's information or account.",
            updates: "Content can be reviewed and edited by the superadmin from Website Settings.",
        },
    },

};

async function findOrCreateSection(section, defaults = {}) {
    const preset = SECTION_DEFAULTS[section] || {};
    const nextDefaults = {
        ...preset,
        ...defaults,
        content: {
            ...(typeof preset.content === "object" && preset.content ? preset.content : {}),
            ...(typeof defaults.content === "object" && defaults.content ? defaults.content : {}),
        },
    };

    let record = await WebsiteContent.findOne({ section });

    if (!record) {
        record = await WebsiteContent.create({
            section,
            title: nextDefaults.title || "",
            subtitle: nextDefaults.subtitle || "",
            description: nextDefaults.description || "",
            content: nextDefaults.content || {},
            images: nextDefaults.images || [],
            published: nextDefaults.published !== false,
            updatedBy: nextDefaults.updatedBy,
        });
    }

    return record;
}

/* =====================================================
   GET ALL WEBSITE CONTENT
===================================================== */

exports.getWebsiteContent = async (req, res) => {
    try {
        await Promise.all(
            DEFAULT_SECTIONS.map((section) =>
                findOrCreateSection(section)
            )
        );

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
   GET CONSTITUTION
===================================================== */

exports.getConstitution = async (req, res) => {
    try {
        const section = await findOrCreateSection("constitution", {
            title: "Constitution",
            subtitle: "Official governance document",
            description: "The latest Benevolent Midax Constitution file.",
            content: { fileUrl: "", fileName: "Benevolent Midax Constitution.pdf" },
            images: [],
        });

        res.json({ success: true, section, file: section.content || {} });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   UPLOAD CONSTITUTION FILE
===================================================== */

exports.uploadConstitutionFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please choose a PDF file to upload." });
        }

        const section = await findOrCreateSection("constitution", {
            title: "Constitution",
            subtitle: "Official governance document",
            description: "The latest Benevolent Midax Constitution file.",
            content: { fileUrl: "", fileName: "Benevolent Midax Constitution.pdf" },
            images: [],
        });

        const fileUrl = resolveStoredFileUrl(req.file, "/documents");

        section.content = {
            ...(typeof section.content === "object" && section.content ? section.content : {}),
            fileUrl,
            fileName: req.file.originalname || "Benevolent Midax Constitution.pdf",
            updatedAt: new Date().toISOString(),
        };
        section.updatedBy = req.user?._id;
        section.published = true;
        await section.save();

        res.status(201).json({
            success: true,
            message: "Constitution file uploaded successfully.",
            section,
            fileUrl,
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

        const imageUrl = resolveStoredFileUrl(req.file, `/uploads/${req.uploadType || "gallery"}`);

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
        const section = await findOrCreateSection(req.params.section);
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
