import API from "./api";

export async function getSettings(role) {
  const normalized = String(role || "member").toLowerCase();
  const endpoint =
    normalized === "superadmin"
      ? "/superadmin/settings"
      : normalized === "admin"
        ? "/admin/settings"
        : "/member/settings";

  const { data } = await API.get(endpoint);
  return data;
}

export async function updateSettings(role, settings) {
  const normalized = String(role || "member").toLowerCase();
  const endpoint =
    normalized === "superadmin"
      ? "/superadmin/settings"
      : normalized === "admin"
        ? "/admin/settings"
        : "/member/settings";

  const { data } = await API.put(endpoint, settings);
  return data;
}
