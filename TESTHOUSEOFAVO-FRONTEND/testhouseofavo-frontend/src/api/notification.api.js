import api from "./axios";

export const notificationApi = {
  mine: () => api.get("/notifications").then((r) => r.data.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data.data),
  markAllRead: () => api.patch("/notifications/read-all").then((r) => r.data.data),
};
