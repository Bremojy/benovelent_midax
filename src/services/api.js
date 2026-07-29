import axios from "axios";

// ========================================
// BASE URL
// ========================================

const BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

// ========================================
// AXIOS INSTANCE
// ========================================

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ========================================
// REQUEST INTERCEPTOR
// ========================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("memberToken") ||
      localStorage.getItem("adminToken") ||
      localStorage.getItem("superAdminToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ========================================
// RESPONSE INTERCEPTOR
// ========================================

api.interceptors.response.use(
  (response) => response,

  (error) => {

    // Auto logout if token expired
    if (error.response?.status === 401) {

      localStorage.removeItem("memberToken");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("superAdminToken");
      localStorage.removeItem("user");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

    }

    console.error(
      "API Error:",
      error.response?.data || error.message
    );

    return Promise.reject(error);

  }
);

export default api;

// Used for images uploaded by multer
export const UPLOAD_URL = BASE_URL;