import axios from "axios";

const API =
  import.meta.env.VITE_API_URL ||
  "https://benovelent-midax.onrender.com/api";

function authHeader() {
  const token =
    localStorage.getItem("memberToken") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("superAdminToken");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

// ================================
// GET SETTINGS
// ================================

export async function getSettings() {
  const res = await axios.get(
    `${API}/members/settings`,
    authHeader()
  );

  return res.data;
}

// ================================
// UPDATE SETTINGS
// ================================

export async function updateSettings(data) {
  const res = await axios.put(
    `${API}/members/settings`,
    data,
    authHeader()
  );

  return res.data;
}