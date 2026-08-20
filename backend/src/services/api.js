import axios from "axios";

// ========================================
// BASE URL
// ========================================

const DEFAULT_REMOTE_API_URL = "https://benovelent-midax.onrender.com";
const DEFAULT_LOCAL_API_URL = "http://localhost:5000";

const configuredBaseUrl = String(import.meta.env.VITE_API_URL || "").trim();

const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");

const BASE_URL = normalizeBaseUrl(
  configuredBaseUrl ||
    (typeof window !== "undefined" &&
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
      ? DEFAULT_LOCAL_API_URL
      : DEFAULT_REMOTE_API_URL)
);

export const API_BASE_URL = BASE_URL;

export const resolveApiUrl = (path = "") => {
  if (!path) return BASE_URL;
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

// ========================================
// AXIOS INSTANCE
// ========================================

const API = axios.create({
  baseURL: `${BASE_URL}/api`,
  // Keep ordinary portal calls responsive while still allowing Render cold-starts.
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 20000),

  headers: {
    "Content-Type": "application/json",
  },
});

// ========================================
// GET AUTH TOKEN
// ========================================

const getToken = () => {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch (_) {
    user = null;
  }

  const role = String(user?.role || "").trim().toLowerCase();
  const tokenByRole = {
    superadmin: "superAdminToken",
    admin: "adminToken",
    member: "memberToken",
  };

  // Prefer the authenticated account role. Do not silently use another
  // portal's token; that can produce confusing 401/403 responses.
  const roleKey = tokenByRole[role];
  if (roleKey) {
    return localStorage.getItem(roleKey);
  }

  // Only use pathname as a recovery path when the role has not yet been
  // restored, never as a way to switch credentials between portals.
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  if (pathname.startsWith("/superadmin")) return localStorage.getItem("superAdminToken");
  if (pathname.startsWith("/admin")) return localStorage.getItem("adminToken");
  if (pathname.startsWith("/member")) return localStorage.getItem("memberToken");
  return null;
};

// ========================================
// REQUEST INTERCEPTOR
// ========================================

API.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) =>
    Promise.reject(error)
);

// ========================================
// CLEAR AUTH SESSION
// ========================================

export const clearAuthSession = () => {
  localStorage.removeItem(
    "memberToken"
  );

  localStorage.removeItem(
    "adminToken"
  );

  localStorage.removeItem(
    "superAdminToken"
  );

  localStorage.removeItem(
    "user"
  );
};

// ========================================
// RESPONSE INTERCEPTOR
// ========================================

API.interceptors.response.use(
  (response) =>
    response,

  (error) => {
    const status =
      error.response?.status;

    const code =
      error.response?.data?.code;

    console.error(
      "API Error:",
      error.response?.data ||
        error.message
    );

    // ======================================
    // AUTHENTICATION FAILURE
    // ======================================

    if (
      status === 401 &&
      [
        "TOKEN_EXPIRED",
        "TOKEN_INVALID",
        "TOKEN_MISSING",
        "USER_NOT_FOUND",
        "AUTH_FAILED",
      "SESSION_REPLACED",
      ].includes(code)
    ) {
      clearAuthSession();

      if (
        window.location.pathname !==
        "/login"
      ) {
        window.location.href =
          "/login";
      }
    }

    return Promise.reject(error);
  }
);

// ========================================
// EXPORT
// ========================================

export default API;

export const UPLOAD_URL = BASE_URL;

export const resolveUploadUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(raw)) return raw;
  return `${BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
};