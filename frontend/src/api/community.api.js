import api from "./axios";

export const communityApi = {
  list: (params) => api.get("/communities", { params }).then((r) => r.data.data),
  getOne: (slug) => api.get(`/communities/${slug}`).then((r) => r.data.data),
  create: (data) => api.post("/communities", data).then((r) => r.data.data),
  join: (id) => api.post(`/communities/${id}/join`).then((r) => r.data.data),
  leave: (id) => api.post(`/communities/${id}/leave`).then((r) => r.data.data),
};

export const postApi = {
  list: (params) => api.get("/posts", { params }).then((r) => r.data.data),
  getOne: (id) => api.get(`/posts/${id}`).then((r) => r.data.data),
  create: (data) => api.post("/posts", data).then((r) => r.data.data),
  vote: (id, direction) => api.post(`/posts/${id}/vote`, { direction }).then((r) => r.data.data),
  resolve: (id, data) => api.patch(`/posts/${id}/resolve`, data).then((r) => r.data.data),
  remove: (id) => api.delete(`/posts/${id}`).then((r) => r.data.data),
};

export const commentApi = {
  listForPost: (post) => api.get("/comments", { params: { post } }).then((r) => r.data.data),
  create: (data) => api.post("/comments", data).then((r) => r.data.data),
  upvote: (id) => api.post(`/comments/${id}/upvote`).then((r) => r.data.data),
  remove: (id) => api.delete(`/comments/${id}`).then((r) => r.data.data),
};
