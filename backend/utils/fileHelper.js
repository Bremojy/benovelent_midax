const fs = require("fs");
const path = require("path");

// ==========================================================
// CHECK IF FILE EXISTS
// ==========================================================

const fileExists = (filePath) => {
  if (!filePath) return false;

  try {
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
};

// ==========================================================
// DELETE FILE
// ==========================================================

const deleteFile = (filePath) => {
  if (!filePath) return false;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    return false;
  } catch (err) {
    console.error("Delete File Error:", err.message);
    return false;
  }
};

// ==========================================================
// REPLACE FILE
// Deletes old file after successful upload
// ==========================================================

const replaceFile = (oldFile, newFile) => {
  if (!oldFile || !newFile) return;

  if (oldFile !== newFile) {
    deleteFile(oldFile);
  }
};

// ==========================================================
// ENSURE DIRECTORY EXISTS
// ==========================================================

const ensureDirectory = (directory) => {
  if (!directory) return;

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// ==========================================================
// RETURN RELATIVE UPLOAD PATH
// ==========================================================

const getRelativeUploadPath = (absolutePath) => {
  if (!absolutePath) return null;

  const uploadsIndex = absolutePath.lastIndexOf("uploads");

  if (uploadsIndex === -1) return absolutePath;

  return absolutePath
    .substring(uploadsIndex)
    .replace(/\\/g, "/");
};

// ==========================================================
// BUILD PUBLIC FILE URL
// ==========================================================

const getFileUrl = (req, filePath) => {
  if (!filePath) return null;

  const relativePath = getRelativeUploadPath(filePath);

  return `${req.protocol}://${req.get("host")}/${relativePath}`;
};

// ==========================================================
// NORMALIZE PATH
// Windows ↔ Linux compatibility
// ==========================================================

const normalizePath = (filePath) => {
  if (!filePath) return null;

  return filePath.replace(/\\/g, "/");
};

// ==========================================================
// FILE SIZE
// ==========================================================

const getFileSize = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return 0;

    const stats = fs.statSync(filePath);

    return stats.size;
  } catch (err) {
    return 0;
  }
};

// ==========================================================
// FILE EXTENSION
// ==========================================================

const getExtension = (filePath) => {
  if (!filePath) return "";

  return path.extname(filePath).toLowerCase();
};

// ==========================================================
// FILE NAME ONLY
// ==========================================================

const getFileName = (filePath) => {
  if (!filePath) return "";

  return path.basename(filePath);
};

// ==========================================================
// EXPORTS
// ==========================================================

module.exports = {
  fileExists,
  deleteFile,
  replaceFile,
  ensureDirectory,
  getRelativeUploadPath,
  getFileUrl,
  normalizePath,
  getFileSize,
  getExtension,
  getFileName,
};