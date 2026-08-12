import API from "./api";

export const getFeedbackCollections = () => API.get("/feedback");
export const createFeedbackCollection = (payload) => API.post("/feedback", payload);
export const createBuiltInFeedback = () => API.post("/feedback/built-in");
export const updateFeedbackCollection = (id, payload) => API.put(`/feedback/${id}`, payload);
export const deleteFeedbackCollection = (id) => API.delete(`/feedback/${id}`);
export const submitFeedback = (id, answers) => API.post(`/feedback/${id}/responses`, { answers });
export const getFeedbackResponses = (id) => API.get(`/feedback/${id}/responses`);
