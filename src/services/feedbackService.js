import API from "./api";

export const getFeedbackCollections = () => API.get("/feedback");
export const getPendingLoginFeedback = () => API.get("/feedback/pending/login");
export const createFeedbackCollection = (payload) => API.post("/feedback", payload);
export const createBuiltInFeedback = () => API.post("/feedback/built-in");
export const autoGenerateFeedback = (topic) => API.post("/feedback/auto-generate", { topic });
export const updateFeedbackCollection = (id, payload) => API.put(`/feedback/${id}`, payload);
export const deleteFeedbackCollection = (id) => API.delete(`/feedback/${id}`);
export const submitFeedback = (id, answers) => API.post(`/feedback/${id}/responses`, { answers });
export const getFeedbackResponses = (id) => API.get(`/feedback/${id}/responses`);

export const exportFeedbackResponses = (id, format = "csv") => API.get(`/feedback/${id}/export`, { params: { format }, responseType: "blob" });
export const importFeedbackResponses = (id, file, mode = "append") => { const fd = new FormData(); fd.append("file", file); fd.append("mode", mode); return API.post(`/feedback/${id}/import`, fd); };
export const publishFeedbackToNews = (id) => API.post(`/feedback/${id}/publish-news`);
export const downloadPublishedFeedback = (id, format = "csv") => API.get(`/feedback/published/${id}/download`, { params: { format }, responseType: "blob" });
