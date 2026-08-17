import api from "./axios";

export const paymentApi = {
  createOrder: (data) => api.post("/payments/create-order", data).then((r) => r.data.data),
  verify: (data) => api.post("/payments/verify", data).then((r) => r.data.data),
  mine: () => api.get("/payments/mine").then((r) => r.data.data),
};
