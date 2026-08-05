const { upload, useCloudinary, isProduction, uploadBufferToCloudinary } = require("../config/uploadConfig");

const decorateCloudinaryFile = (cloudResult, uploadType, sourceFile = {}) => {
  if (!cloudResult) return sourceFile;

  if (!useCloudinary) return sourceFile;

  return {
    ...sourceFile,
    ...cloudResult,
    path: cloudResult.secure_url || cloudResult.url || sourceFile.path,
    url: cloudResult.secure_url || cloudResult.url || sourceFile.url || sourceFile.path,
    secure_url: cloudResult.secure_url || cloudResult.url || sourceFile.path,
    filename: cloudResult.public_id || sourceFile.filename || cloudResult.asset_id,
    originalname: sourceFile.originalname || cloudResult.original_filename || sourceFile.name,
    mimetype: sourceFile.mimetype || cloudResult.mimetype || sourceFile.mimetype,
    size: cloudResult.bytes || sourceFile.size,
    cloudinary: {
      public_id: cloudResult.public_id,
      resource_type: cloudResult.resource_type,
      format: cloudResult.format,
      folder: uploadType,
    },
  };
};

const uploadFilesToCloudinary = async (req) => {
  if (!useCloudinary) return;

  const uploadType = req.uploadType || "general";

  if (req.file) {
    const sourceFile = req.file;
    const result = await uploadBufferToCloudinary(sourceFile, uploadType);
    req.file = decorateCloudinaryFile(result, uploadType, sourceFile);
  }

  if (Array.isArray(req.files)) {
    const uploaded = [];
    for (const file of req.files) {
      const result = await uploadBufferToCloudinary(file, uploadType);
      uploaded.push(decorateCloudinaryFile(result, uploadType, file));
    }
    req.files = uploaded;
  } else if (req.files && typeof req.files === "object") {
    const nextFiles = {};
    for (const [fieldName, files] of Object.entries(req.files)) {
      nextFiles[fieldName] = [];
      for (const file of files || []) {
        const result = await uploadBufferToCloudinary(file, uploadType);
        nextFiles[fieldName].push(decorateCloudinaryFile(result, uploadType, file));
      }
    }
    req.files = nextFiles;
  }
};

const setUploadType = (type) => {
  return (req, res, next) => {
    req.uploadType = type;
    next();
  };
};

const wrapUpload = (parser) => {
  return (req, res, next) => {
    parser(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }

      try {
        if (isProduction && !useCloudinary) {
          return res.status(500).json({
            success: false,
            message: "Cloudinary is not configured on the backend. Add CLOUDINARY_URL or CLOUDINARY_* environment variables on Render.",
          });
        }

        await uploadFilesToCloudinary(req);
        next();
      } catch (uploadError) {
        next(uploadError);
      }
    });
  };
};

const uploadSingle = (fieldName = "file") => wrapUpload(upload.single(fieldName));
const uploadArray = (fieldName = "files", maxCount = 10) => wrapUpload(upload.array(fieldName, maxCount));
const uploadFields = (fields = []) => wrapUpload(upload.fields(fields));

module.exports = {
  setUploadType,
  uploadSingle,
  uploadArray,
  uploadFields,
};
