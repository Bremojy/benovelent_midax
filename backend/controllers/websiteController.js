const fs = require("fs");
const path = require("path");
const WebsiteContent = require("../models/WebsiteContent");
const redisCache = require("../services/redisCache");
const createAuditLog = require("../utils/createAuditLog");

const invalidateWebsitePublicCache = async () => {
    await redisCache.invalidateMany([
        "public:website:content",
        "public:website:gallery",
        "public:website:constitution",
        "public:website:settings",
        "assistant:public:context",
        "assistant:public",
    ]);
};
const { getSystemSettings, toPublicConfig } = require("../services/systemSettings");
const { resolveStoredFileUrl } = require("../utils/uploadUrl");
const { useCloudinary, cloudinary, getCloudinaryFolder, uploadRoot } = require("../config/uploadConfig");
const { isAllowedSection, pickSectionPayload, sanitizeValue } = require("../config/websiteManagerRegistry");

const DEFAULT_SECTIONS = ["home", "about", "services", "contact", "footer", "settings", "gallery", "constitution", "privacy-policy", "terms-conditions", "disclaimer", "news", "events", "resources", "chatbot"];


async function ensureConstitutionCloudinary(section) {
    const currentUrl = String(section?.content?.fileUrl || "");
    if (!useCloudinary || !currentUrl || !/^\/documents\//i.test(currentUrl)) return section;
    const candidates = [
        path.join(__dirname, "..", "..", "public", "documents", "benevolent-midax-constitution.pdf"),
        path.join(__dirname, "..", "uploads", "documents", "benevolent-midax-constitution.pdf"),
    ];
    const source = candidates.find((file) => fs.existsSync(file));
    if (!source) return section;
    try {
        const uploaded = await cloudinary.uploader.upload(source, {
            folder: getCloudinaryFolder("documents"),
            resource_type: "raw",
            use_filename: true,
            unique_filename: true,
            overwrite: false,
        });
        section.content = { ...(section.content || {}), fileUrl: uploaded.secure_url, fileName: "Benevolent Midax Constitution.pdf", version: Number(section.content?.version || 1), updatedAt: new Date().toISOString() };
        await section.save();
        await invalidateWebsitePublicCache();
    } catch (error) {
        console.warn("Constitution Cloudinary migration skipped:", error.message);
    }
    return section;
}

const SECTION_DEFAULTS = {
    "news": { title: "Newsroom", subtitle: "News, events and community updates", description: "Public information centre for Benevolent MIDAX.", content: { tabs: ["news", "events", "resources"] } },
    "events": { title: "Upcoming activities", subtitle: "Community calendar", description: "Published events appear inside the public Newsroom.", content: {} },
    "resources": { title: "Resources", subtitle: "Forms, guides and official documents", description: "Published documents appear inside the public Newsroom.", content: {} },
    "chatbot": { title: "MIDAX Assistant", subtitle: "Approved assistant guidance", description: "Controls the assistant public positioning and approved knowledge scope.", content: { enabled: true, mode: "grounded" } },
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
    "disclaimer": {
        title: "Disclaimer",
        subtitle: "Important limitations and notices",
        description: "Public information is provided for guidance and remains subject to the Benevolent Fund Scheme Constitution and approved procedures.",
        content: {
            overview: "Published information can be updated by authorised administrators. Where there is a conflict, the constitution, approved policy records and authoritative portal records govern.",
            support: "Support availability, eligibility, approvals and payments depend on the applicable policy and documented review outcome.",
            communication: "Public website content does not grant access to private member records or override role-based portal permissions.",
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

async function findSection(section, filter = {}) {
    return WebsiteContent.findOne({ section, ...filter });
}

const toPublicSection = (section) => {
    if (!section) return null;
    const source = typeof section.toObject === "function" ? section.toObject() : section;
    const { updatedBy, ...safe } = source;
    if (safe.section === "constitution" && safe.content && typeof safe.content === "object") {
        const { versionHistory, ...publicContent } = safe.content;
        safe.content = publicContent;
    }
    if (safe.section === "gallery") {
        const items = normalizeGalleryItems(safe).filter((item) => item.published);
        safe.images = items.map((item) => item.url);
        safe.content = {
            ...(safe.content && typeof safe.content === "object" ? safe.content : {}),
            galleryItems: items,
        };
    }
    if (safe.section === "resources" && safe.content && typeof safe.content === "object") {
        const rawDocuments = Array.isArray(safe.content.documents) ? safe.content.documents : [];
        safe.content = {
            ...safe.content,
            documents: rawDocuments
                .filter((item) => item && typeof item === "object" && item.published !== false && item.isPublic !== false)
                .slice(0, 200)
                .map((item) => ({
                    id: String(item.id || item._id || ""),
                    title: String(item.title || item.name || ""),
                    name: String(item.name || item.fileName || item.title || ""),
                    description: String(item.description || ""),
                    category: String(item.category || "General"),
                    url: String(item.url || item.fileUrl || item.downloadUrl || ""),
                    size: Number.isFinite(Number(item.size)) && Number(item.size) >= 0 ? Number(item.size) : 0,
                    mimeType: String(item.mimeType || "application/octet-stream"),
                    version: String(item.version || "1"),
                    published: item.published !== false,
                    uploadedAt: item.uploadedAt || null,
                    updatedAt: item.updatedAt || item.uploadedAt || null,
                    archivedAt: item.archivedAt || null,
                })),
        };
    }
    return safe;
};

const normalizeGalleryItems = (section) => {
    const content = section?.content && typeof section.content === "object" ? section.content : {};
    const configured = Array.isArray(content.galleryItems) ? content.galleryItems : [];
    if (configured.length) {
        return configured
            .filter((item) => item && item.url)
            .map((item, index) => ({
                id: String(item.id || item._id || `legacy-${index}`),
                url: String(item.url),
                title: String(item.title || ""),
                caption: String(item.caption || ""),
                altText: String(item.altText || item.alt || "Benevolent MIDAX community moment"),
                published: item.published !== false,
                order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
            }))
            .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    }

    return (Array.isArray(section?.images) ? section.images : [])
        .filter(Boolean)
        .map((url, index) => ({
            id: `legacy-${index}`,
            url: String(url),
            title: "",
            caption: "",
            altText: "Benevolent MIDAX community moment",
            published: true,
            order: index,
        }));
};

const toPublicGallerySection = (section) => {
    const safe = toPublicSection(section);
    if (!safe) return null;
    const items = normalizeGalleryItems(section).filter((item) => item.published);
    return {
        ...safe,
        images: items.map((item) => item.url),
        content: {
            ...(safe.content && typeof safe.content === "object" ? safe.content : {}),
            galleryItems: items,
        },
    };
};

const toAdminGallerySection = (section) => {
    const safe = toPublicSection(section);
    if (!safe) return null;
    const items = normalizeGalleryItems(section);
    return {
        ...safe,
        images: items.map((item) => item.url),
        content: {
            ...(safe.content && typeof safe.content === "object" ? safe.content : {}),
            galleryItems: items,
        },
    };
};

/* =====================================================
   GET ALL WEBSITE CONTENT
===================================================== */

exports.getWebsiteContent = async (req, res) => {
    try {
        const cached = await redisCache.getJson("public:website:content");
        if (cached) {
            res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
            return res.json(cached);
        }
        const content = (await WebsiteContent.find({ published: true }).sort({ section: 1 }).lean()).map(toPublicSection);
        const payload = { success: true, count: content.length, content };
        await redisCache.setJson("public:website:content", payload, 300);
        res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
        res.json(payload);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   GET WEBSITE SETTINGS
===================================================== */

exports.getWebsiteSettings = async (_req, res) => {
    try {
        const settings = await getSystemSettings();
        if (!settings) return res.status(503).json({ success: false, message: "Website system settings are not configured." });
        const payload = { success: true, settings: toPublicConfig(settings), updatedAt: settings.updatedAt || null };
        await redisCache.setJson("public:website:settings", payload, 300);
        res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
        res.json(payload);
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
        const cached = await redisCache.getJson("public:website:gallery");
        if (cached) {
            res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
            return res.json(cached);
        }
        const section = await findSection("gallery", { published: true });
        if (!section) return res.status(404).json({ success: false, message: "Gallery is not configured." });

        const publicSection = toPublicGallerySection(section);
        const payload = { success: true, section: publicSection, gallery: publicSection?.images || [] };
        await redisCache.setJson("public:website:gallery", payload, 300);
        res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
        res.json(payload);
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
        const cached = await redisCache.getJson("public:website:constitution");
        if (cached) {
            res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
            return res.json(cached);
        }
        let section = await findSection("constitution", { published: true });
        if (!section) return res.status(404).json({ success: false, message: "Constitution is not configured." });

        section = await ensureConstitutionCloudinary(section);
        const publicSection = toPublicSection(section);
        const payload = { success: true, section: publicSection, file: publicSection?.content || {} };
        await redisCache.setJson("public:website:constitution", payload, 300);
        res.set("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
        res.json(payload);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   CONSTITUTION VERSION MANAGEMENT
===================================================== */

exports.getConstitutionManagement = async (_req, res) => {
    try {
        const section = await findOrCreateSection("constitution", {
            title: "Constitution",
            subtitle: "Official governance document",
            description: "The latest Benevolent Midax Constitution file.",
            content: { fileUrl: "/documents/benevolent-midax-constitution.pdf", fileName: "Benevolent Midax Constitution.pdf" },
            images: [],
        });
        const content = section.content && typeof section.content === "object" ? section.content : {};
        const history = Array.isArray(content.versionHistory) ? content.versionHistory.slice().sort((a, b) => Number(b.version || 0) - Number(a.version || 0)) : [];
        return res.json({
            success: true,
            current: {
                version: Number(content.version || 1),
                fileUrl: content.fileUrl || "",
                fileName: content.fileName || "Benevolent Midax Constitution.pdf",
                updatedAt: content.updatedAt || section.updatedAt || null,
            },
            history,
        });
    } catch (error) {
        console.error("Constitution management error:", error);
        return res.status(500).json({ success: false, message: "Unable to load constitution version history right now." });
    }
};

exports.restoreConstitutionVersion = async (req, res) => {
    try {
        const requestedVersion = Number(req.params.version);
        if (!Number.isInteger(requestedVersion) || requestedVersion < 1) {
            return res.status(400).json({ success: false, message: "Choose a valid constitution version." });
        }

        const section = await findOrCreateSection("constitution", {
            title: "Constitution",
            subtitle: "Official governance document",
            description: "The latest Benevolent Midax Constitution file.",
            content: {},
            images: [],
        });
        const content = section.content && typeof section.content === "object" ? section.content : {};
        const history = Array.isArray(content.versionHistory) ? content.versionHistory.slice() : [];
        const candidate = history.find((item) => Number(item?.version) === requestedVersion);
        if (!candidate?.fileUrl) return res.status(404).json({ success: false, message: "That constitution version is no longer available." });

        const currentVersion = Number(content.version || 1);
        const current = content.fileUrl ? {
            version: currentVersion,
            fileUrl: content.fileUrl,
            fileName: content.fileName || "Benevolent Midax Constitution.pdf",
            updatedAt: content.updatedAt || section.updatedAt || null,
            archivedAt: new Date().toISOString(),
        } : null;
        const nextVersion = Math.max(currentVersion, ...history.map((item) => Number(item?.version) || 0)) + 1;

        const nextHistory = current ? [current, ...history.filter((item) => Number(item?.version) !== currentVersion)] : history;
        section.content = {
            ...content,
            fileUrl: candidate.fileUrl,
            fileName: candidate.fileName || "Benevolent Midax Constitution.pdf",
            version: nextVersion,
            restoredFromVersion: requestedVersion,
            updatedAt: new Date().toISOString(),
            versionHistory: nextHistory.slice(0, 30),
        };
        section.updatedBy = req.user._id;
        section.published = true;
        await section.save();
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user._id,
            userRole: String(req.user.role || "superadmin").toLowerCase(),
            action: "RESTORE_VERSION",
            module: "Constitution",
            description: `Restored Constitution version ${requestedVersion} as current version ${nextVersion}.`,
            req,
            metadata: { restoredFromVersion: requestedVersion, currentVersion: nextVersion, fileUrl: candidate.fileUrl },
        });

        return res.json({ success: true, message: `Constitution version ${requestedVersion} restored successfully.`, current: { version: nextVersion, fileUrl: section.content.fileUrl, fileName: section.content.fileName, updatedAt: section.content.updatedAt } });
    } catch (error) {
        console.error("Constitution restore error:", error);
        return res.status(500).json({ success: false, message: "Unable to restore that constitution version right now." });
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

        const originalName = String(req.file.originalname || "").trim();
        const extension = path.extname(originalName).toLowerCase();
        const mime = String(req.file.mimetype || "").toLowerCase();
        if (mime !== "application/pdf" || extension !== ".pdf") {
            return res.status(400).json({ success: false, code: "PDF_REQUIRED", message: "The Constitution must be uploaded as a PDF file." });
        }

        const section = await findOrCreateSection("constitution", {
            title: "Constitution",
            subtitle: "Official governance document",
            description: "The latest Benevolent Midax Constitution file.",
            content: { fileUrl: "/documents/benevolent-midax-constitution.pdf", fileName: "Benevolent Midax Constitution.pdf" },
            images: [],
        });

        const fileUrl = resolveStoredFileUrl(req.file, "/documents");

        const previousContent = typeof section.content === "object" && section.content ? section.content : {};
        const previousVersion = Number(previousContent.version || 0);
        const previousHistory = Array.isArray(previousContent.versionHistory) ? previousContent.versionHistory.slice() : [];
        const previousFileUrl = String(previousContent.fileUrl || "");
        const previousFileName = String(previousContent.fileName || "");
        const baseVersion = previousVersion || (previousFileUrl ? 1 : 0);
        const nextVersion = baseVersion + 1;
        const previousEntry = previousFileUrl ? {
            version: baseVersion,
            fileUrl: previousFileUrl,
            fileName: previousFileName || "Benevolent Midax Constitution.pdf",
            updatedAt: previousContent.updatedAt || section.updatedAt || null,
            archivedAt: new Date().toISOString(),
        } : null;
        section.content = {
            ...previousContent,
            fileUrl,
            fileName: req.file.originalname || "Benevolent Midax Constitution.pdf",
            version: nextVersion,
            updatedAt: new Date().toISOString(),
            versionHistory: previousEntry ? [previousEntry, ...previousHistory.filter((item) => Number(item?.version) !== previousEntry.version)].slice(0, 30) : previousHistory.slice(0, 30),
        };
        section.updatedBy = req.user?._id;
        section.published = true;
        await section.save();
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user?._id,
            userRole: String(req.user?.role || "superadmin").toLowerCase(),
            action: "UPLOAD_VERSION",
            module: "Constitution",
            description: `Published Constitution version ${nextVersion}.`,
            req,
            metadata: { version: nextVersion, fileUrl, fileName: section.content.fileName },
        });

        res.status(201).json({
            success: true,
            message: `Constitution version ${nextVersion} uploaded successfully.`,
            section: toPublicSection(section),
            fileUrl,
            version: nextVersion,
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

        const section = await findSection("gallery");
        if (!section) return res.status(404).json({ success: false, message: "Gallery is not configured." });
        const mime = String(req.file.mimetype || "").toLowerCase();
        if (!mime.startsWith("image/")) {
            return res.status(400).json({ success: false, code: "IMAGE_REQUIRED", message: "Gallery uploads must be image files." });
        }

        const imageUrl = resolveStoredFileUrl(req.file, `/uploads/${req.uploadType || "gallery"}`);
        const currentItems = normalizeGalleryItems(section);
        const nextOrder = currentItems.length ? Math.max(...currentItems.map((item) => Number(item.order) || 0)) + 1 : 0;
        const galleryItem = {
            id: require("crypto").randomUUID(),
            url: imageUrl,
            title: String(req.body.title || "").trim(),
            caption: String(req.body.caption || "").trim(),
            altText: String(req.body.altText || req.body.title || "Benevolent MIDAX community moment").trim() || "Benevolent MIDAX community moment",
            published: true,
            order: nextOrder,
        };

        const nextItems = [...currentItems, galleryItem];
        section.images = Array.from(new Set(nextItems.map((item) => item.url)));

        if (req.body.subtitle?.trim() && !section.subtitle) section.subtitle = req.body.subtitle.trim();
        if (req.body.description?.trim() && !section.description) section.description = req.body.description.trim();

        section.content = {
            ...(typeof section.content === "object" && section.content ? section.content : {}),
            galleryItems: nextItems,
            lastUploadAt: new Date().toISOString(),
        };
        section.updatedBy = req.user?._id;

        await section.save();
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user?._id,
            userRole: String(req.user?.role || "superadmin").toLowerCase(),
            action: "UPLOAD",
            module: "WebsiteGallery",
            description: `Uploaded gallery image ${galleryItem.id}.`,
            req,
            metadata: { galleryItemId: galleryItem.id, imageUrl, title: galleryItem.title, caption: galleryItem.caption },
        });

        res.status(201).json({
            success: true,
            message: "Gallery image uploaded successfully.",
            section: toAdminGallerySection(section),
            imageUrl,
            galleryItem,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   RESOURCE DOCUMENT MANAGEMENT
===================================================== */

const RESOURCE_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt"]);
const RESOURCE_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
]);

const normalizeResourceItems = (section) => {
    const content = section?.content && typeof section.content === "object" ? section.content : {};
    return Array.isArray(content.documents) ? content.documents.filter((item) => item && typeof item === "object") : [];
};

const cleanupResourceUpload = async (req) => {
    if (useCloudinary && req.file?.cloudinary?.public_id) {
        try { await cloudinary.uploader.destroy(req.file.cloudinary.public_id, { resource_type: req.file.cloudinary.resource_type || "raw" }); } catch (_) {}
    } else if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
};

exports.uploadResourceDocument = async (req, res) => {
    let createdLocalFile = "";
    let resourcePersisted = false;
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Choose a document to upload." });
        const originalName = path.basename(String(req.file.originalname || "document").replace(/\\/g, "/")).slice(0, 180);
        const extension = path.extname(originalName).toLowerCase();
        const mime = String(req.file.mimetype || "").toLowerCase();
        if (!RESOURCE_EXTENSIONS.has(extension) || !RESOURCE_MIME_TYPES.has(mime)) {
            await cleanupResourceUpload(req);
            return res.status(400).json({ success: false, code: "RESOURCE_FILE_TYPE_NOT_ALLOWED", message: "Upload a PDF, Word, Excel, PowerPoint, or plain-text document." });
        }
        if (Number(req.file.size || 0) > 20 * 1024 * 1024) {
            await cleanupResourceUpload(req);
            return res.status(413).json({ success: false, message: "Resource documents must be 20 MB or smaller." });
        }

        const title = String(req.body.title || path.basename(originalName, extension) || "Resource document").trim().slice(0, 180);
        const description = String(req.body.description || "").trim().slice(0, 1200);
        const category = String(req.body.category || "General").trim().slice(0, 80) || "General";
        const version = String(req.body.version || "1").trim().slice(0, 30) || "1";
        if (!title) {
            await cleanupResourceUpload(req);
            return res.status(400).json({ success: false, message: "A resource title is required." });
        }

        const section = await findOrCreateSection("resources", {
            title: "Resources", subtitle: "Forms, guides and official documents",
            description: "Published documents appear inside the public Newsroom.", content: { documents: [] },
        });
        const currentItems = normalizeResourceItems(section);
        if (currentItems.length >= 200) {
            await cleanupResourceUpload(req);
            return res.status(409).json({ success: false, message: "The resource library has reached its 200-document limit. Archive an existing resource before adding another." });
        }
        const id = require("crypto").randomUUID();
        let url;
        if (useCloudinary) {
            url = resolveStoredFileUrl(req.file, "");
            if (!/^https:\/\//i.test(url)) throw new Error("Cloudinary did not return a secure HTTPS document URL.");
        } else {
            if (!req.file.filename || !req.file.path) throw new Error("The local document upload did not produce a stored file reference.");
            createdLocalFile = req.file.path;
            url = `/api/website/resources/${id}/file`;
        }
        const now = new Date().toISOString();
        const resource = {
            id,
            title,
            name: originalName,
            fileName: originalName,
            storageFileName: useCloudinary ? "" : path.basename(req.file.filename),
            storageKind: useCloudinary ? "cloudinary" : "website-resource",
            description,
            category,
            version,
            url,
            size: Number(req.file.size || 0),
            mimeType: mime,
            published: String(req.body.published || "true").toLowerCase() !== "false",
            isPublic: true,
            uploadedAt: now,
            publishedAt: String(req.body.published || "true").toLowerCase() !== "false" ? now : null,
            updatedAt: now,
            uploadedBy: String(req.user?._id || ""),
        };

        section.content = {
            ...(section.content && typeof section.content === "object" && !Array.isArray(section.content) ? section.content : {}),
            documents: [...currentItems, resource],
        };
        section.updatedBy = req.user?._id;
        await section.save();
        resourcePersisted = true;
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user?._id,
            userRole: String(req.user?.role || "superadmin").toLowerCase(),
            action: "UPLOAD",
            module: "WebsiteResources",
            description: `${resource.published ? "Published" : "Uploaded draft of"} resource document ${title}.`,
            req,
            metadata: { resourceId: id, title, category, published: resource.published, size: resource.size },
        });

        const safeResource = {
            id: resource.id, title: resource.title, name: resource.name, description: resource.description,
            category: resource.category, url: resource.url, size: resource.size, mimeType: resource.mimeType,
            version: resource.version, published: resource.published, uploadedAt: resource.uploadedAt,
            publishedAt: resource.publishedAt || null, updatedAt: resource.updatedAt, archivedAt: resource.archivedAt || null,
        };
        return res.status(201).json({ success: true, message: resource.published ? "Resource uploaded and published." : "Resource uploaded as a draft.", section: toPublicSection(section), resource: safeResource });
    } catch (error) {
        if (!resourcePersisted) {
            if (!useCloudinary && createdLocalFile) { try { fs.unlinkSync(createdLocalFile); } catch (_) {} }
            else await cleanupResourceUpload(req);
        }
        console.error("Resource document upload error:", error);
        return res.status(500).json({ success: false, message: "Unable to upload this resource document right now." });
    }
};

exports.updateResourceDocument = async (req, res) => {
    try {
        const section = await WebsiteContent.findOne({ section: "resources" });
        if (!section) return res.status(404).json({ success: false, message: "Resources are not configured." });
        const items = normalizeResourceItems(section);
        const index = items.findIndex((item) => String(item.id || item._id || "") === String(req.params.resourceId));
        if (index < 0) return res.status(404).json({ success: false, message: "Resource document not found." });
        const current = { ...items[index] };
        if (req.body.title !== undefined && !String(req.body.title).trim()) {
            return res.status(400).json({ success: false, message: "Resource title cannot be empty." });
        }
        const wasPublished = current.published !== false;
        for (const key of ["title", "description", "category", "version"]) {
            if (req.body[key] !== undefined) current[key] = String(req.body[key]).trim().slice(0, key === "description" ? 1200 : 180);
        }
        if (req.body.published !== undefined) {
            if (typeof req.body.published !== "boolean") return res.status(400).json({ success: false, message: "Publication status must be true or false." });
            current.published = req.body.published;
            if (!req.body.published) current.archivedAt = new Date().toISOString();
            else {
                delete current.archivedAt;
                if (!wasPublished) current.publishedAt = new Date().toISOString();
            }
        }
        current.updatedAt = new Date().toISOString();
        items[index] = current;
        section.content = { ...(section.content && typeof section.content === "object" ? section.content : {}), documents: items };
        section.updatedBy = req.user?._id;
        await section.save();
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user?._id,
            userRole: String(req.user?.role || "superadmin").toLowerCase(),
            action: current.published ? "UPDATE" : "ARCHIVE",
            module: "WebsiteResources",
            description: `${current.published ? "Updated" : "Archived"} resource document ${current.title || current.name}.`,
            req,
            metadata: { resourceId: current.id, published: current.published },
        });
        return res.json({ success: true, message: current.published ? "Resource saved." : "Resource archived from the public website.", resource: toPublicSection({ section: "resources", content: { documents: [current] } }).content.documents[0] });
    } catch (error) {
        console.error("Resource document update error:", error);
        return res.status(500).json({ success: false, message: "Unable to update this resource document right now." });
    }
};

exports.downloadPublicResourceDocument = async (req, res) => {
    try {
        const section = await WebsiteContent.findOne({ section: "resources", published: true }).select("content").lean();
        const item = normalizeResourceItems(section).find((resource) => String(resource.id || "") === String(req.params.resourceId) && resource.published !== false && resource.isPublic !== false);
        if (!item) return res.status(404).json({ success: false, message: "This published resource is not available." });
        if (/^https:\/\//i.test(String(item.url || ""))) return res.redirect(302, item.url);

        const storedName = String(item.storageFileName || "");
        // Resource uploads use their own storage bucket, never DOCUMENT_ROOT,
        // which may contain private evidence or other administrative uploads.
        const allowedStoredName = /^\d+-\d+-[A-Za-z0-9_-]+\.(pdf|docx?|xlsx?|pptx?|txt)$/i.test(storedName);
        if (item.storageKind !== "website-resource" || !allowedStoredName || path.basename(storedName) !== storedName || storedName.includes("..")) {
            return res.status(404).json({ success: false, message: "This resource file is not available." });
        }
        const root = path.resolve(path.join(uploadRoot, "resources"));
        const target = path.resolve(root, storedName);
        if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
            return res.status(404).json({ success: false, message: "This resource file is not available." });
        }
        const safeName = path.basename(String(item.name || item.fileName || "resource-document")).replace(/[\r\n"\\]/g, "_").slice(0, 180);
        const contentTypes = { ".pdf": "application/pdf", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".xls": "application/vnd.ms-excel", ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".ppt": "application/vnd.ms-powerpoint", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".txt": "text/plain; charset=utf-8" };
        res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        res.type(contentTypes[path.extname(safeName).toLowerCase()] || "application/octet-stream");
        return res.sendFile(target);
    } catch (error) {
        console.error("Public resource download error:", error);
        return res.status(500).json({ success: false, message: "Unable to download this resource right now." });
    }
};

/* =====================================================
   GALLERY ITEM MANAGEMENT
===================================================== */

exports.updateGalleryItem = async (req, res) => {
    try {
        const section = await findOrCreateSection("gallery", {
            title: "Gallery",
            subtitle: "Community gallery",
            description: "Published community images.",
            images: [],
            content: {},
        });
        const items = normalizeGalleryItems(section);
        const itemIndex = items.findIndex((item) => item.id === String(req.params.itemId));
        if (itemIndex < 0) return res.status(404).json({ success: false, message: "Gallery item not found." });

        const current = items[itemIndex];
        const next = {
            ...current,
            title: req.body.title !== undefined ? String(req.body.title || "").trim() : current.title,
            caption: req.body.caption !== undefined ? String(req.body.caption || "").trim() : current.caption,
            altText: req.body.altText !== undefined ? String(req.body.altText || "").trim() || "Benevolent MIDAX community moment" : current.altText,
            published: typeof req.body.published === "boolean" ? req.body.published : current.published,
            order: req.body.order !== undefined && Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : current.order,
        };
        items[itemIndex] = next;
        items.forEach((item, index) => { item.order = Number.isFinite(Number(item.order)) ? Number(item.order) : index; });
        section.content = {
            ...(typeof section.content === "object" && section.content ? section.content : {}),
            galleryItems: items,
        };
        section.images = Array.from(new Set(items.map((item) => item.url)));
        section.updatedBy = req.user._id;
        await section.save();
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user._id,
            userRole: String(req.user.role || "superadmin").toLowerCase(),
            action: "UPDATE",
            module: "WebsiteGallery",
            description: `Updated gallery item ${next.id}.`,
            req,
            metadata: { galleryItemId: next.id, published: next.published, order: next.order },
        });
        return res.json({ success: true, message: "Gallery item updated successfully.", galleryItem: next, section: toAdminGallerySection(section) });
    } catch (error) {
        console.error("Gallery item update error:", error);
        return res.status(500).json({ success: false, message: "Unable to update the gallery item right now." });
    }
};

exports.reorderGallery = async (req, res) => {
    try {
        const requested = Array.isArray(req.body?.items) ? req.body.items : [];
        if (!requested.length) return res.status(400).json({ success: false, message: "Provide the gallery item order." });

        const section = await findSection("gallery");
        if (!section) return res.status(404).json({ success: false, message: "Gallery is not configured." });
        const items = normalizeGalleryItems(section);
        const byId = new Map(requested.map((item, index) => [String(item?.id || ""), Number.isFinite(Number(item?.order)) ? Number(item.order) : index]));
        items.forEach((item, index) => { if (byId.has(item.id)) item.order = byId.get(item.id); else if (!Number.isFinite(Number(item.order))) item.order = index; });
        items.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
        items.forEach((item, index) => { item.order = index; });

        section.content = { ...(typeof section.content === "object" && section.content ? section.content : {}), galleryItems: items };
        section.images = items.map((item) => item.url);
        section.updatedBy = req.user._id;
        await section.save();
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user._id,
            userRole: String(req.user.role || "superadmin").toLowerCase(),
            action: "REORDER",
            module: "WebsiteGallery",
            description: "Reordered public gallery items.",
            req,
            metadata: { itemCount: items.length },
        });
        return res.json({ success: true, message: "Gallery order saved.", section: toAdminGallerySection(section) });
    } catch (error) {
        console.error("Gallery reorder error:", error);
        return res.status(500).json({ success: false, message: "Unable to reorder gallery items right now." });
    }
};

exports.archiveGalleryItem = async (req, res) => {
    try {
        const section = await findSection("gallery");
        if (!section) return res.status(404).json({ success: false, message: "Gallery is not configured." });
        const items = normalizeGalleryItems(section);
        const item = items.find((entry) => entry.id === String(req.params.itemId));
        if (!item) return res.status(404).json({ success: false, message: "Gallery item not found." });

        item.published = false;
        section.content = { ...(typeof section.content === "object" && section.content ? section.content : {}), galleryItems: items };
        section.images = items.map((entry) => entry.url);
        section.updatedBy = req.user._id;
        await section.save();
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user._id,
            userRole: String(req.user.role || "superadmin").toLowerCase(),
            action: "ARCHIVE",
            module: "WebsiteGallery",
            description: `Archived gallery item ${item.id} from public display without deleting its stored asset.`,
            req,
            metadata: { galleryItemId: item.id, imageUrl: item.url },
        });
        return res.json({ success: true, archived: true, message: "Gallery item archived from the public site.", section: toAdminGallerySection(section) });
    } catch (error) {
        console.error("Gallery archive error:", error);
        return res.status(500).json({ success: false, message: "Unable to archive the gallery item right now." });
    }
};

/* =====================================================
   AUTHORIZED CMS CONTENT
===================================================== */

exports.getWebsiteManagementContent = async (_req, res) => {
    try {
        const content = await WebsiteContent.find({}).sort({ section: 1 }).lean();
        return res.json({ success: true, count: content.length, content });
    } catch (error) {
        console.error("Website CMS content error:", error);
        return res.status(500).json({ success: false, message: "Unable to load website content right now." });
    }
};

/* =====================================================
   GET SINGLE SECTION
===================================================== */

exports.getSection = async (req, res) => {
    try {
        const section = await findSection(req.params.section, { published: true });
        if (!section) return res.status(404).json({ success: false, message: "Website section not found." });
        res.json({ success: true, section: toPublicSection(section) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   CREATE SECTION
===================================================== */

exports.createSection = async (req, res) => {
    try {
        const sectionKey = String(req.body?.section || "").trim().toLowerCase();
        if (!isAllowedSection(sectionKey)) {
            return res.status(400).json({ success: false, message: "This website section is not managed through the Website Manager." });
        }

        const existing = await WebsiteContent.findOne({ section: sectionKey });
        if (existing) {
            return res.status(400).json({ success: false, message: "Section already exists." });
        }

        const payload = pickSectionPayload(sectionKey, req.body);
        const section = await WebsiteContent.create({
            section: sectionKey,
            title: payload.title || "",
            subtitle: payload.subtitle || "",
            description: payload.description || "",
            content: payload.content || {},
            images: Array.isArray(payload.images) ? payload.images : [],
            published: payload.published !== false,
            updatedBy: req.user._id,
        });
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user._id,
            userRole: String(req.user.role || "superadmin").toLowerCase(),
            action: "CREATE",
            module: "WebsiteContent",
            description: `Created website section ${sectionKey}.`,
            req,
            metadata: { section: sectionKey, fields: Object.keys(payload) },
        });

        res.status(201).json({ success: true, message: "Section created successfully.", section: toPublicSection(section) });
    } catch (error) {
        console.error("Website section create error:", error);
        res.status(500).json({ success: false, message: "Unable to create website section right now." });
    }
};

/* =====================================================
   UPDATE SECTION
===================================================== */

exports.updateSection = async (req, res) => {
    try {
        const sectionKey = String(req.params.section || "").trim().toLowerCase();
        if (!isAllowedSection(sectionKey)) {
            return res.status(400).json({ success: false, message: "This website section is not managed through the Website Manager." });
        }

        const section = await WebsiteContent.findOne({ section: sectionKey });
        if (!section) {
            return res.status(404).json({ success: false, message: "Section not found." });
        }

        const payload = pickSectionPayload(sectionKey, req.body);
        if (payload.title !== undefined) section.title = String(payload.title).trim();
        if (payload.subtitle !== undefined) section.subtitle = String(payload.subtitle).trim();
        if (payload.description !== undefined) section.description = String(payload.description).trim();

        if (payload.content !== undefined) {
            const incomingContent = sanitizeValue(payload.content);
            if (sectionKey === "settings" && incomingContent && typeof incomingContent === "object" && !Array.isArray(incomingContent)) {
                section.content = { ...(section.content && typeof section.content === "object" ? section.content : {}), ...incomingContent };
            } else if (sectionKey === "resources" && incomingContent && typeof incomingContent === "object" && !Array.isArray(incomingContent)) {
                const oldContent = section.content && typeof section.content === "object" ? section.content : {};
                const oldDocuments = Array.isArray(oldContent.documents) ? oldContent.documents : [];
                const incomingDocuments = Array.isArray(incomingContent.documents) ? incomingContent.documents : oldDocuments;
                const mergedDocuments = incomingDocuments.slice(0, 200).map((item) => {
                    const oldItem = oldDocuments.find((candidate) => String(candidate?.id || candidate?._id || "") === String(item?.id || item?._id || ""));
                    if (!oldItem) return item;
                    // Preserve private storage/ownership fields when the editable
                    // content payload contains only public metadata.
                    return { ...oldItem, ...item, storageFileName: oldItem.storageFileName || "", storageKind: oldItem.storageKind || "", uploadedBy: oldItem.uploadedBy || "" };
                });
                section.content = { ...oldContent, ...incomingContent, documents: mergedDocuments };
            } else {
                section.content = incomingContent;
            }
        }

        if (payload.images !== undefined) section.images = Array.isArray(payload.images) ? payload.images : [];
        if (typeof payload.published === "boolean") section.published = payload.published;
        section.updatedBy = req.user._id;

        await section.save();
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user._id,
            userRole: String(req.user.role || "superadmin").toLowerCase(),
            action: "UPDATE",
            module: "WebsiteContent",
            description: `Updated website section ${sectionKey}.`,
            req,
            metadata: { section: sectionKey, fields: Object.keys(payload), published: section.published },
        });

        res.json({ success: true, message: "Website updated successfully.", section: toPublicSection(section) });
    } catch (error) {
        console.error("Website section update error:", error);
        res.status(500).json({ success: false, message: "Unable to update website content right now." });
    }
};

/* =====================================================
   DELETE SECTION
===================================================== */

exports.deleteSection = async (req, res) => {
    try {
        const section = await WebsiteContent.findOne({ section: req.params.section });

        if (!section) {
            return res.status(404).json({ success: false, message: "Section not found." });
        }

        section.published = false;
        section.updatedBy = req.user._id;
        await section.save();
        await invalidateWebsitePublicCache();
        await createAuditLog({
            user: req.user._id,
            userRole: String(req.user.role || "superadmin").toLowerCase(),
            action: "UNPUBLISH",
            module: "WebsiteContent",
            description: `Unpublished website section ${req.params.section} without deleting its stored content.`,
            req,
            metadata: { section: req.params.section },
        });

        res.json({ success: true, archived: true, published: false, message: "Section unpublished. Stored content was retained." });
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
        await invalidateWebsitePublicCache();

        res.json({ success: true, message: "Website initialized successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
