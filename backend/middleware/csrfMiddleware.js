const crypto = require("crypto");
const { ACCESS_COOKIE, CSRF_COOKIE, baseCookieOptions } = require("../utils/authCookies");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const newToken = () => crypto.randomBytes(32).toString("hex");

const ensureCsrfCookie = (req, res) => {
  const existing = String(req.cookies?.[CSRF_COOKIE] || "").trim();
  if (existing) return existing;

  const token = newToken();
  res.cookie(CSRF_COOKIE, token, {
    ...baseCookieOptions,
    httpOnly: false,
    maxAge: 12 * 60 * 60 * 1000,
  });
  return token;
};

const csrfEndpoint = (req, res) => {
  const token = ensureCsrfCookie(req, res);
  res.status(200).json({ success: true, csrfToken: token });
};

const verifyCsrf = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();

  // Legacy bearer clients are intentionally not blocked by this cookie-CSRF
  // layer. The browser frontend uses the HttpOnly auth cookie path below.
  if (!req.cookies?.[ACCESS_COOKIE]) return next();

  const cookieToken = String(req.cookies?.[CSRF_COOKIE] || "").trim();
  const headerToken = String(req.get("X-CSRF-Token") || "").trim();

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF validation failed.",
      code: "CSRF_INVALID",
    });
  }

  return next();
};

module.exports = {
  csrfEndpoint,
  verifyCsrf,
};
