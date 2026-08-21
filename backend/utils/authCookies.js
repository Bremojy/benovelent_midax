const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";

const ACCESS_COOKIE = "benevolent_access";
const CSRF_COOKIE = "benevolent_csrf";
const ACCESS_MAX_AGE = 30 * 60 * 1000;
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
