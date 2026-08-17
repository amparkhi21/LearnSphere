import api from "./axios";

export const enrollmentApi = {
  enroll: (data) => api.post("/enrollments", data).then((r) => r.data.data),
  mine: () => api.get("/enrollments/mine").then((r) => r.data.data),
  updateProgress: (id, data) => api.patch(`/enrollments/${id}/progress`, data).then((r) => r.data.data),
  review: (id, data) => api.post(`/enrollments/${id}/review`, data).then((r) => r.data.data),
};
