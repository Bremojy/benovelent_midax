const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadRoot = path.join(__dirname, "..", "uploads");

const ensureDirectory = (directory) => {
  fs.mkdirSync(directory, { recursive: true });
};

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // All uploads remain under backend/uploads as requested.
    // A lightweight type folder keeps profile/support/media files organized.
    const type = req.uploadType || "general";
    const safeType = String(type).replace(/[^a-zA-Z0-9_-]/g, "");
    const destination = path.join(uploadRoot, safeType || "general");

    ensureDirectory(destination);
    cb(null, destination);
  },

  filename(req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const base = path
      .basename(file.originalname || "file", extension)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 60);

    cb(
      null,
      `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base || "file"}${extension}`
    );
  },
});

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Unsupported file type. Use JPG, PNG, WEBP, PDF or DOC/DOCX."
      )
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 10,
  },
});

module.exports = {
  storage,
  upload,
  uploadRoot,
};
