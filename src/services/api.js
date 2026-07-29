import axios from "axios";

// ========================================
// BASE URL
// ========================================

// Development
const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

// Axios instance
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
      localStorage.getItem("adminToken") ||
      localStorage.getItem("memberToken") ||
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
    console.error(
      "API Error:",
      error.response?.data || error.message
    );

    return Promise.reject(error);
  }
);

export default api;

// Upload URL helper
export const UPLOAD_URL = BASE_URL;