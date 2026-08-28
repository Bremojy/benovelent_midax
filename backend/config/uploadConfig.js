const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v2: cloudinary } = require("cloudinary");

const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();
const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

const useCloudinary = Boolean(
  cloudinaryUrl || (cloudName && apiKey && apiSecret)
);


if (process.env.NODE_ENV === "production" && !useCloudinary) {
  console.warn("Cloudinary is not configured. Durable production uploads are disabled; configure Cloudinary before accepting image/PDF uploads.");
}

if (useCloudinary) {
  if (cloudinaryUrl) {
    cloudinary.config(cloudinaryUrl);
  } else {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }
}

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

const localStorage = multer.diskStorage({
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

const storage = useCloudinary ? multer.memoryStorage() : localStorage;

const allowedMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "audio/webm", "audio/ogg", "audio/mpeg", "audio/wav", "audio/mp4", "audio/m4a",
  "video/webm", "video/mp4", "video/quicktime", "video/x-matroska",
]);

const fileFilter = (req, file, cb) => allowedMimeTypes.has(file.mimetype)
  ? cb(null, true)
  : cb(new Error("Unsupported file type."));

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 10 },
});

const getCloudinaryFolder = (uploadType = "general") => {
  const type = String(uploadType || "general").replace(/[^a-zA-Z0-9_-]/g, "") || "general";
  return `benevolent-midax/${type}`;
};

const uploadBufferToCloudinary = async (file, uploadType = "general") => {
  if (!useCloudinary) return null;
  if (!file?.buffer) throw new Error("Missing file buffer for cloud upload.");

  const folder = getCloudinaryFolder(uploadType);
  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const resourceType = String(file.mimetype || "").startsWith("image/")
    ? "image"
    : (String(file.mimetype || "").startsWith("video/") ? "video" : "raw");
  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });

  return result;
};

module.exports = {
  storage,
  upload,
  uploadRoot,
  documentRoot,
  useCloudinary,
  cloudinary,
  getCloudinaryFolder,
  uploadBufferToCloudinary,
};
