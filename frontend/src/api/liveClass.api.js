import api from "./axios";

export const liveClassApi = {
  teacherMine: () => api.get("/live-classes/teacher/mine").then((response) => response.data.data),
  studentMine: () => api.get("/live-classes/student/mine").then((response) => response.data.data),
  schedule: (data) => api.post("/live-classes", data).then((response) => response.data.data),
  start: (id) => api.post(`/live-classes/${id}/start`).then((response) => response.data.data),
  end: (id) => api.post(`/live-classes/${id}/end`).then((response) => response.data.data),
  cancel: (id) => api.post(`/live-classes/${id}/cancel`).then((response) => response.data.data),
  token: (id) => api.post(`/live-classes/${id}/token`).then((response) => response.data.data),
};
