import api from "./axios";

export const studyPlanApi = {
  generate: (data) => api.post("/study-plans/generate", data).then((r) => r.data.data),
  mine: () => api.get("/study-plans/mine").then((r) => r.data.data),
  getOne: (id) => api.get(`/study-plans/${id}`).then((r) => r.data.data),
  updateProgress: (id, data) => api.patch(`/study-plans/${id}/progress`, data).then((r) => r.data.data),
  remove: (id) => api.delete(`/study-plans/${id}`).then((r) => r.data.data),
};
