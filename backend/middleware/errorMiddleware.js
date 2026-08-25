const Response = require("../utils/response");

// =====================================================
// 404 NOT FOUND MIDDLEWARE
// =====================================================

const notFound = (req, res, next) => {
  const message = `Route '${req.originalUrl}' was not found.`;
  console.warn("404 ROUTE_NOT_FOUND:", req.method, req.originalUrl);
  return res.status(404).json({
    success: false,
    code: "ROUTE_NOT_FOUND",
    message,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
};

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

const errorHandler = (err, req, res, next) => {
  console.error("\n====================================");
  console.error("ERROR:", err.message);
  console.error("URL:", req.originalUrl);
  console.error("METHOD:", req.method);
  console.error("TIME:", new Date().toISOString());

  if (process.env.NODE_ENV === "development") {
    console.error("STACK:");
    console.error(err.stack);
  }

  console.error("====================================\n");

  // -------------------------------
  // Multer Errors
  // -------------------------------

  if (err.name === "MulterError") {
    return Response.error(
      res,
      err.message,
      400
    );
  }

  // -------------------------------
  // MongoDB Invalid ObjectId
  // -------------------------------

  if (err.name === "CastError") {
    return Response.error(
      res,
      "Invalid resource ID.",
      400
    );
  }

  // -------------------------------
  // Duplicate Key
  // -------------------------------

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];

    return Response.conflict(
      res,
      `${field} already exists.`
    );
  }

  // -------------------------------
  // Validation Errors
  // -------------------------------

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map(
      (e) => e.message
    );

    return Response.validation(
      res,
      errors
    );
  }

  // -------------------------------
  // JWT Errors
  // -------------------------------

  if (err.name === "JsonWebTokenError") {
    return Response.unauthorized(
      res,
      "Invalid authentication token."
    );
  }

  if (err.name === "TokenExpiredError") {
    return Response.unauthorized(
      res,
      "Authentication token has expired."
    );
  }

  // -------------------------------
  // Default Error
  // -------------------------------

  return Response.serverError(
    res,
    err,
    err.message || "Internal Server Error."
  );
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  notFound,
  errorHandler,
};