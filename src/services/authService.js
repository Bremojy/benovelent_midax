import API, { setCsrfToken } from "./api";

export const getCsrfToken = async () => {
  const { data } = await API.get("/auth/csrf");
  return setCsrfToken(data?.csrfToken || "");
};

export const loginUser = async (email, password) => {
  const { data } = await API.post("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });
  if (data?.csrfToken) setCsrfToken(data.csrfToken);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await API.get("/auth/me");
  return data;
};

export const logoutUser = async () => {
  try {
    const { data } = await API.post("/auth/logout");
    return data;
  } catch (error) {
    console.warn("Backend logout request failed:", error.response?.data || error.message);
    return { success: false };
  }
};
