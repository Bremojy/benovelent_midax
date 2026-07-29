import API from "./api";

// =======================================
// DASHBOARD
// =======================================

export const getMemberDashboard = async () => {
  const { data } = await API.get("/member/dashboard");
  return data;
};

// =======================================
// PROFILE
// =======================================

export const getMemberProfile = async () => {
  const { data } = await API.get("/member/profile");
  return data;
};

export const updateMemberProfile = async (profile) => {
  const { data } = await API.put(
    "/member/profile",
    profile
  );
  return data;
};

// =======================================
// SUMMARY
// =======================================

export const getMemberSummary = async () => {
  const { data } = await API.get("/member/summary");
  return data;
};

// =======================================
// SETTINGS
// =======================================

export const getMemberSettings = async () => {
  const { data } = await API.get("/member/settings");
  return data;
};

export const updateMemberSettings = async (settings) => {
  const { data } = await API.put(
    "/member/settings",
    settings
  );
  return data;
};

// =======================================
// NOTIFICATIONS
// =======================================

export const getNotifications = async () => {
  const { data } = await API.get(
    "/notifications"
  );
  return data;
};

// =======================================
// MESSAGES
// =======================================

export const getMessages = async () => {
  const { data } = await API.get(
    "/messages"
  );
  return data;
};

// =======================================
// CONTRIBUTIONS
// =======================================

export const getContributions = async () => {
  const { data } = await API.get(
    "/member/contributions"
  );
  return data;
};

// =======================================
// CLAIMS
// =======================================

export const getClaims = async () => {
  const { data } = await API.get(
    "/member/claims"
  );
  return data;
};

// =======================================
// ANNOUNCEMENTS
// =======================================

export const getAnnouncements = async () => {
  const { data } = await API.get(
    "/announcements"
  );
  return data;
};