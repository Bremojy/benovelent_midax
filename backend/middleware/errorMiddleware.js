const Response = require("../utils/response");

// =====================================================
// 404 NOT FOUND MIDDLEWARE
// =====================================================

const notFound = (req, res, next) => {
  return Response.notFound(
    res,
    `Route '${req.originalUrl}' was not found.`
  );
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
  // Request parsing / payload errors
  // -------------------------------

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return Response.error(
      res,
      "The request body contains invalid JSON.",
      400
    );
  }

  if (err.type === "entity.too.large") {
    return Response.error(
      res,
      "The uploaded request is too large.",
      413
    );
  }

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