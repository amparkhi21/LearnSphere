import api from "./axios";

export const bookmarkApi = {
  add: (data) => api.post("/bookmarks", data).then((r) => r.data.data),
  mine: (params) => api.get("/bookmarks", { params }).then((r) => r.data.data),
  remove: (id) => api.delete(`/bookmarks/${id}`).then((r) => r.data.data),
};
