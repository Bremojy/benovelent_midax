const { upload } = require("../config/uploadConfig");

// ======================================================
// SET UPLOAD TYPE
// This middleware tells Multer which folder to use.
// ======================================================

const setUploadType = (type) => {
  return (req, res, next) => {
    req.uploadType = type;
    next();
  };
};

// ======================================================
// SINGLE FILE UPLOAD
// ======================================================

const uploadSingle = (fieldName = "file") => {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      next();
    });
  };
};

// ======================================================
// MULTIPLE FILES
// ======================================================

const uploadArray = (fieldName = "files", maxCount = 10) => {
  return (req, res, next) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      next();
    });
  };
};

// ======================================================
// MULTIPLE NAMED FIELDS
// ======================================================

const uploadFields = (fields = []) => {
  return (req, res, next) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      next();
    });
  };
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  setUploadType,
  uploadSingle,
  uploadArray,
  uploadFields,
};