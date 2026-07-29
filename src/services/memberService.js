import API from "./api";

export const getMemberDashboard = async () => {
  const { data } = await API.get("/member/dashboard");
  return data;
};

export const getMemberProfile = async () => {
  const { data } = await API.get("/member/profile");
  return data;
};

export const getMemberSummary = async () => {
  const { data } = await API.get("/member/summary");
  return data;
};