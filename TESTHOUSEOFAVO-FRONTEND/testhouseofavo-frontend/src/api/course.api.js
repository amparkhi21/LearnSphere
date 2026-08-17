import api from "./axios";

export const courseApi = {
  list: (params) => api.get("/courses", { params }).then((r) => r.data.data),
  getOne: (idOrSlug) => api.get(`/courses/${idOrSlug}`).then((r) => r.data.data),
  mine: () => api.get("/courses/teacher/mine").then((r) => r.data.data),
  create: (data) => api.post("/courses", data).then((r) => r.data.data),
  update: (id, data) => api.patch(`/courses/${id}`, data).then((r) => r.data.data),
  remove: (id) => api.delete(`/courses/${id}`).then((r) => r.data.data),
};
