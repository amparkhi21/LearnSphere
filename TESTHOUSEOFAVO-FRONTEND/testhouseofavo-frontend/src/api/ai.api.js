import api from "./axios";

export const aiApi = {
  status: () => api.get("/ai/status").then((r) => r.data.data),
  recommendResources: (data) => api.post("/ai/recommend-resources", data).then((r) => r.data.data),
  courseOutline: (data) => api.post("/ai/course-outline", data).then((r) => r.data.data),
  doubtAssist: (data) => api.post("/ai/doubt-assist", data).then((r) => r.data.data),
};
