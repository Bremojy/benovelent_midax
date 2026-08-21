const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";

const ACCESS_COOKIE = "benevolent_access";
const CSRF_COOKIE = "benevolent_csrf";
const parseDurationMs = (value, fallbackMs = 7 * 24 * 60 * 60 * 1000) => {
  const raw = String(value || "").trim();
  if (!raw) return fallbackMs;
  if (/^\d+$/.test(raw)) return Number(raw) * 1000;
  const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*(ms|s|m|h|d|w)$/i);
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  return Math.max(1000, Math.floor(amount * multipliers[unit]));
};

const ACCESS_MAX_AGE = parseDurationMs(
  process.env.JWT_EXPIRE || process.env.JWT_EXPIRES_IN || "7d"
);
const CSRF_MAX_AGE = 12 * 60 * 60 * 1000;

const baseCookieOptions = {
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

const setAuthCookies = (res, token, csrfToken) => {
  res.cookie(ACCESS_COOKIE, token, {
    ...baseCookieOptions,
    httpOnly: true,
    maxAge: ACCESS_MAX_AGE,
  });

  res.cookie(CSRF_COOKIE, csrfToken, {
    ...baseCookieOptions,
    httpOnly: false,
    maxAge: CSRF_MAX_AGE,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, baseCookieOptions);
  res.clearCookie(CSRF_COOKIE, baseCookieOptions);
};

module.exports = {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  ACCESS_MAX_AGE,
  baseCookieOptions,
  setAuthCookies,
  clearAuthCookies,
};
