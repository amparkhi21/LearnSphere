import api from "./axios";

export const userApi = {
  getProfile: (id) => api.get(`/users/${id}`).then((r) => r.data.data),
  updateMe: (data) => api.patch("/users/me", data).then((r) => r.data.data),
  list: (params) => api.get("/users", { params }).then((r) => r.data.data),
  toggleBan: (id) => api.patch(`/users/${id}/ban`).then((r) => r.data.data),
};
