/**
 * ============================================================
 * BENEVOLENT MIDAX
 * STANDARD API RESPONSE HELPER
 * ============================================================
 */

/**
 * Success Response
 */
const success = (
  res,
  message = "Request successful.",
  data = null,
  statusCode = 200,
  meta = {}
) => {
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Error Response
 */
const error = (
  res,
  message = "Something went wrong.",
  statusCode = 500,
  errors = null
) => {
  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Validation Error
 */
const validation = (res, errors) => {
  return res.status(422).json({
    success: false,
    statusCode: 422,
    message: "Validation failed.",
    errors,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Unauthorized
 */
const unauthorized = (
  res,
  message = "Unauthorized access."
) => {
  return error(res, message, 401);
};

/**
 * Forbidden
 */
const forbidden = (
  res,
  message = "Access denied."
) => {
  return error(res, message, 403);
};

/**
 * Not Found
 */
const notFound = (
  res,
  message = "Resource not found."
) => {
  return error(res, message, 404);
};

/**
 * Conflict
 */
const conflict = (
  res,
  message = "Resource already exists."
) => {
  return error(res, message, 409);
};

/**
 * Server Error
 */
const serverError = (
  res,
  err = null,
  message = "Internal server error."
) => {
  return res.status(500).json({
    success: false,
    statusCode: 500,
    message,
    error:
      process.env.NODE_ENV === "development"
        ? err?.message || err
        : undefined,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Created
 */
const created = (
  res,
  message = "Created successfully.",
  data = null
) => {
  return success(res, message, data, 201);
};

/**
 * Updated
 */
const updated = (
  res,
  message = "Updated successfully.",
  data = null
) => {
  return success(res, message, data, 200);
};

/**
 * Deleted
 */
const deleted = (
  res,
  message = "Deleted successfully."
) => {
  return success(res, message, null, 200);
};

/**
 * Paginated Response
 */
const paginated = (
  res,
  data,
  pagination,
  message = "Request successful."
) => {
  return res.status(200).json({
    success: true,
    statusCode: 200,
    message,
    data,
    pagination,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  success,
  error,
  validation,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  serverError,
  created,
  updated,
  deleted,
  paginated,
};