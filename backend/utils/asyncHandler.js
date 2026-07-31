/**
 * ==========================================================
 * BENEVOLENT MIDAX
 * ASYNC HANDLER
 * ==========================================================
 *
 * Wraps async Express controllers and automatically forwards
 * any rejected Promise or thrown Error to the global
 * error middleware.
 *
 * Example:
 *
 * router.get("/", asyncHandler(getMembers));
 *
 */

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;