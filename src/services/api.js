import axios from "axios";

const CLIENT_APP_VERSION = String(import.meta.env.VITE_APP_VERSION || "18.5.0").trim();
const createRequestId = () => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {}
  return `midax-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

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

// Production browsers use the deployment's same-origin /api proxy by default.
// This keeps authentication cookies on the browser origin and works for both
// *.vercel.app and custom Vercel domains. A fully-qualified VITE_API_URL can
// still explicitly override this behavior for non-proxy deployments.
const isAbsoluteConfiguredUrl = /^https?:\/\//i.test(configuredBaseUrl);
const BASE_URL = normalizeBaseUrl(
  typeof window !== "undefined"
    ? (isLocalHost
        ? (isAbsoluteConfiguredUrl ? configuredBaseUrl : DEFAULT_LOCAL_API_URL)
        : (isAbsoluteConfiguredUrl ? configuredBaseUrl : window.location.origin))
    : (configuredBaseUrl || DEFAULT_REMOTE_API_URL)
);

// User-uploaded media is served from the durable Render backend.
const ASSET_BASE_URL = normalizeBaseUrl(
  typeof window !== "undefined" && !isLocalHost
    ? (isAbsoluteConfiguredUrl ? configuredBaseUrl : DEFAULT_REMOTE_API_URL)
    : BASE_URL
);

export const API_BASE_URL = BASE_URL;

export const resolveApiUrl = (path = "") => {
  if (!path) return BASE_URL;
  if (/^(https?:\/\/|blob:|data:)/i.test(path)) return path;
  const raw = String(path);
  const base = /^\/(?:uploads|documents)\b/i.test(raw) ? ASSET_BASE_URL : BASE_URL;
  return `${base}${raw.startsWith("/") ? "" : "/"}${raw}`;
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
  config.headers = config.headers || {};
  config.headers["X-Client-App-Version"] = CLIENT_APP_VERSION;
  config.headers["X-Request-ID"] = config.headers["X-Request-ID"] || createRequestId();
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

const isAuthBootstrapRequest = (url) => {
  const path = String(url || "");
  return /\/auth\/(?:me|csrf)(?:\?|$)/i.test(path);
};

const pendingGets = new Map();
const isRetryableGet = (config, error) => {
  const method = String(config?.method || "get").toLowerCase();
  if (method !== "get" || config?.skipRetry) return false;
  if (isAuthBootstrapRequest(config?.url)) return false;
  const status = error?.response?.status;
  return !error?.response || status === 408 || status === 429 || status >= 500;
};

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config || {};
    const status = error.response?.status;
    const requestId = error.response?.headers?.["x-request-id"] || error.config?.headers?.["X-Request-ID"] || "";
    if (requestId) error.requestId = String(requestId);
    const bootstrapRequest = isAuthBootstrapRequest(config.url);
    const code = error.response?.data?.code;

    if (import.meta.env.DEV) {
      console.error("API Error:", error.response?.data || error.message);
    }

    if (code === "CSRF_INVALID") {
      clearCsrfToken();
    }

    // Never let a stale auth bootstrap request redirect the browser after a
    // newer login has already completed. AuthContext is the authority for
    // bootstrap/session state.
    const isSocketTicketRequest = String(error?.config?.url || "").includes("/auth/socket-ticket");
    const definitiveCodes = ["TOKEN_EXPIRED", "TOKEN_INVALID", "TOKEN_MISSING", "USER_NOT_FOUND", "AUTH_FAILED"];
    if (!bootstrapRequest && !isSocketTicketRequest && status === 401 && definitiveCodes.includes(code)) {
      clearAuthSession();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // One lightweight retry for transient GET failures such as a Render cold
    // start. Never retry authentication bootstrap requests or mutations.
    if (isRetryableGet(config, error)) {
      const key = `${String(config.method || "get").toUpperCase()}:${String(config.baseURL || "")}:${String(config.url || "")}`;
      const attempts = Number(config.__retryCount || 0);
      if (attempts < 1) {
        config.__retryCount = attempts + 1;
        await new Promise((resolve) => setTimeout(resolve, 450));
        return API.request(config);
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
  return `${ASSET_BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
};
