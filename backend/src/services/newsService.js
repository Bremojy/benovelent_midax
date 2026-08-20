import API from "./api";

export const getManagedNews = async (params = {}) => (await API.get("/news", { params })).data;
export const createManagedNews = async (formData) => (await API.post("/news", formData, { headers: { "Content-Type": "multipart/form-data" } })).data;
export const deleteManagedNews = async (id) => (await API.delete(`/news/${id}`)).data;
export const updateManagedNews = async (id, payload) => (await API.put(`/news/${id}`, payload)).data;
