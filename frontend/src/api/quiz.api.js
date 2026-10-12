import api from "./axios";

export const quizApi = {
  list: (params) => api.get("/quizzes", { params }).then((r) => r.data.data),
  mine: (params) => api.get("/quizzes/mine", { params }).then((r) => r.data.data),
  getOne: (id) => api.get(`/quizzes/${id}`).then((r) => r.data.data),
  create: (data) => api.post("/quizzes", data).then((r) => r.data.data),
  // AI generation can take a while (provider latency + free-tier server cold start), so allow 90s.
  generate: (data, { signal } = {}) =>
    api.post("/quizzes/generate", data, { timeout: 90000, signal }).then((r) => r.data.data),
};

export const quizAttemptApi = {
  submit: (data) => api.post("/quiz-attempts", data).then((r) => r.data.data),
  mine: () => api.get("/quiz-attempts/mine").then((r) => r.data.data),
  getOne: (id) => api.get(`/quiz-attempts/${id}`).then((r) => r.data.data),
};
