const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadRoot = process.env.UPLOAD_ROOT
  ? path.resolve(process.env.UPLOAD_ROOT)
  : (process.env.RENDER === "true" || process.env.NODE_ENV === "production"
      ? path.join("/var", "data", "uploads")
      : path.join(__dirname, "..", "uploads"));

const documentRoot = process.env.DOCUMENT_ROOT
  ? path.resolve(process.env.DOCUMENT_ROOT)
  : (process.env.RENDER === "true" || process.env.NODE_ENV === "production"
      ? path.join("/var", "data", "documents")
      : path.join(__dirname, "..", "documents"));
const ensureDirectory = (directory) => fs.mkdirSync(directory, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const type = String(req.uploadType || "general").replace(/[^a-zA-Z0-9_-]/g, "") || "general";
    const destination = type === "documents" ? documentRoot : path.join(uploadRoot, type);
    ensureDirectory(destination);
    cb(null, destination);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const base = path.basename(file.originalname || "file", extension).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 60);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base || "file"}${extension}`);
  },
});

const allowedMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "audio/webm", "audio/ogg", "audio/mpeg", "video/webm", "video/mp4",
]);
const fileFilter = (req, file, cb) => allowedMimeTypes.has(file.mimetype)
  ? cb(null, true)
  : cb(new Error("Unsupported file type."));
const upload = multer({ storage, fileFilter, limits: { fileSize: 12 * 1024 * 1024, files: 10 } });
module.exports = { storage, upload, uploadRoot, documentRoot };
