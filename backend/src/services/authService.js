import API from "./api";

// ========================================
// LOGIN
// ========================================

export const loginUser = async (email, password) => {
  const { data } = await API.post("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });

  return data;
};

// ========================================
// CURRENT USER
// ========================================

export const getCurrentUser = async () => {
  const { data } = await API.get("/auth/me");

  return data;
};

// ========================================
// LOGOUT
// ========================================

export const logoutUser = async () => {
  try {
    const { data } = await API.post("/auth/logout");

    return data;
  } catch (error) {
    // Even if the backend session has already
    // expired, the frontend should still log out.
    console.warn(
      "Backend logout request failed:",
      error.response?.data || error.message
    );

    return {
      success: false,
    };
  }
};