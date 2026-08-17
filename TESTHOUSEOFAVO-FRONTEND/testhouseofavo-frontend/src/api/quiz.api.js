import api from "./axios";

export const quizApi = {
  list: (params) => api.get("/quizzes", { params }).then((r) => r.data.data),
  getOne: (id) => api.get(`/quizzes/${id}`).then((r) => r.data.data),
  create: (data) => api.post("/quizzes", data).then((r) => r.data.data),
  generate: (data) => api.post("/quizzes/generate", data).then((r) => r.data.data),
};

export const quizAttemptApi = {
  submit: (data) => api.post("/quiz-attempts", data).then((r) => r.data.data),
  mine: () => api.get("/quiz-attempts/mine").then((r) => r.data.data),
  getOne: (id) => api.get(`/quiz-attempts/${id}`).then((r) => r.data.data),
};
