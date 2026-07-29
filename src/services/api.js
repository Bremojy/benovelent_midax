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

const API = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ========================================
// REQUEST INTERCEPTOR
// ========================================

API.interceptors.request.use(

  (config) => {

    const memberToken =
      localStorage.getItem("memberToken");

    const adminToken =
      localStorage.getItem("adminToken");

    const superAdminToken =
      localStorage.getItem("superAdminToken");

    const token =
      superAdminToken ||
      adminToken ||
      memberToken;

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;

  },

  (error) => Promise.reject(error)

);

// ========================================
// RESPONSE INTERCEPTOR
// ========================================

API.interceptors.response.use(

  (response) => response,

  (error) => {

    console.error(
      "API Error:",
      error.response?.data ||
      error.message
    );

    if (error.response?.status === 401) {

      localStorage.removeItem("memberToken");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("superAdminToken");
      localStorage.removeItem("user");

      if (
        window.location.pathname !== "/login"
      ) {
        window.location.href = "/login";
      }

    }

    if (error.response?.status === 403) {

      console.warn(
        "Permission denied."
      );

    }

    if (error.response?.status === 500) {

      console.error(
        "Server error."
      );

    }

    return Promise.reject(error);

  }

);

// ========================================
// EXPORTS
// ========================================

export default API;

// Used by uploaded images
export const UPLOAD_URL = BASE_URL;