import axios from "axios";

const DEFAULT_REMOTE_API_URL = "https://benovelent-midax.onrender.com";
const DEFAULT_LOCAL_API_URL = "http://localhost:5000";

const configuredBaseUrl = String(import.meta.env.VITE_API_URL || "").trim();

const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "");

const hostname = typeof window !== "undefined" ? String(window.location.hostname || "").toLowerCase() : "";
const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(hostname);
const isVercelHost = hostname.endsWith(".vercel.app") || hostname === "vercel.app";

// Production browsers use the Vercel same-origin /api proxy by default.
// This avoids cross-site authentication/cookie drift between Vercel and Render.
// A VITE_API_URL may still explicitly override this for a non-Vercel deployment.
const BASE_URL = normalizeBaseUrl(
  isVercelHost
    ? (typeof window !== "undefined" ? window.location.origin : DEFAULT_REMOTE_API_URL)
    : (configuredBaseUrl ||
      (typeof window !== "undefined"
        ? (isLocalHost ? DEFAULT_LOCAL_API_URL : window.location.origin)
        : DEFAULT_REMOTE_API_URL))
);

export const API_BASE_URL = BASE_URL;

export const resolveApiUrl = (path = "") => {
  if (!path) return BASE_URL;
  if (/^(https?:\/\/|blob:|data:)/i.test(path)) return path;
  return `${BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

let csrfToken = "";
let csrfRequest = null;

export const setCsrfToken = (value) => {
  csrfToken = String(value || "").trim();
  return csrfToken;
};

export const clearCsrfToken = () => {
  csrfToken = "";
};

const getCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = axios
      .get(`${BASE_URL}/api/auth/csrf`, {
        timeout: Number(import.meta.env.VITE_API_TIMEOUT || 20000),
        withCredentials: true,
      })
      .then(({ data }) => setCsrfToken(data?.csrfToken || ""))
      .finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
};

const API = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 20000),
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
});

const isMutating = (method) => !["get", "head", "options"].includes(String(method || "get").toLowerCase());

API.interceptors.request.use(async (config) => {
  if (isMutating(config.method) && !config.skipCsrf) {
    const token = await getCsrfToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers["X-CSRF-Token"] = token;
    }
  }
  return config;
}, (error) => Promise.reject(error));

export const clearAuthSession = () => {
  try { sessionStorage.removeItem("user"); } catch {}
  try { sessionStorage.removeItem("benovelentMidaxLastActivity"); } catch {}
  clearCsrfToken();
};

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    if (import.meta.env.DEV) {
      console.error("API Error:", error.response?.data || error.message);
    }

    if (code === "CSRF_INVALID") {
      clearCsrfToken();
    }

    const isSocketTicketRequest = String(config?.url || "").includes("/auth/socket-ticket");
    if (
      !isSocketTicketRequest &&
      status === 401 &&
      ["TOKEN_EXPIRED", "TOKEN_INVALID", "TOKEN_MISSING", "USER_NOT_FOUND", "AUTH_FAILED", "SESSION_REPLACED"].includes(code)
    ) {
      clearAuthSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default API;

export const UPLOAD_URL = BASE_URL;

export const resolveUploadUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(raw)) return raw;
  return `${BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
};
