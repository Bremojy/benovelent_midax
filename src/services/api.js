import axios from "axios";

// ========================================
// BASE URL
// ========================================

const DEFAULT_REMOTE_API_URL = "https://benovelent-midax.onrender.com";
const DEFAULT_LOCAL_API_URL = "http://localhost:5000";

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" &&
   ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
    ? DEFAULT_LOCAL_API_URL
    : DEFAULT_REMOTE_API_URL);

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
  timeout: 15000,

  headers: {
    "Content-Type": "application/json",
  },
});

// ========================================
// GET AUTH TOKEN
// ========================================

const getToken = () => {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const role = String(user?.role || "").toLowerCase();

  const byPortal = pathname.startsWith("/superadmin")
    ? localStorage.getItem("superAdminToken")
    : pathname.startsWith("/admin")
      ? localStorage.getItem("adminToken")
      : pathname.startsWith("/member")
        ? localStorage.getItem("memberToken")
        : null;

  if (byPortal) {
    return byPortal;
  }

  if (role === "superadmin") {
    return localStorage.getItem("superAdminToken");
  }

  if (role === "admin") {
    return localStorage.getItem("adminToken");
  }

  if (role === "member") {
    return localStorage.getItem("memberToken");
  }

  return (
    localStorage.getItem("memberToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("superAdminToken")
  );
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