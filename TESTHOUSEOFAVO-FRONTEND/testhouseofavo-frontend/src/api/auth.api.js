import api from "./axios";

export const authApi = {
  register: (data) => api.post("/auth/register", data).then((r) => r.data.data),
  login: (data) => api.post("/auth/login", data).then((r) => r.data.data),
  logout: () => api.post("/auth/logout").then((r) => r.data.data),
  me: () => api.get("/auth/me").then((r) => r.data.data),
};
