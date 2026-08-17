import api from "./axios";

export const resourceApi = {
  list: (params) => api.get("/resources", { params }).then((r) => r.data.data),
  getOne: (id) => api.get(`/resources/${id}`).then((r) => r.data.data),
  upload: (formData) =>
    api.post("/resources", formData, { headers: { "Content-Type": "multipart/form-data" } }).then((r) => r.data.data),
  trackDownload: (id) => api.post(`/resources/${id}/download`).then((r) => r.data.data),
  remove: (id) => api.delete(`/resources/${id}`).then((r) => r.data.data),
};
