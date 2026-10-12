import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Turn every failure into a plain Error with a SAFE, human-readable message.
// Raw responses / error objects are never passed on to the UI.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (axios.isCancel(err)) {
      const cancelled = new Error("Request cancelled");
      cancelled.isCanceled = true;
      return Promise.reject(cancelled);
    }

    const status = err?.response?.status;
    const data = err?.response?.data;
    const serverMessage = typeof data?.message === "string" ? data.message.trim() : "";

    let message;
    if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT") {
      message = "The request timed out. The server may be waking up - please try again.";
    } else if (!err?.response) {
      message = "Cannot reach the server. Check your internet connection and try again.";
    } else if (serverMessage) {
      message = serverMessage;
    } else if (status >= 500) {
      message = "The server ran into a problem. Please try again shortly.";
    } else {
      message = "Something went wrong";
    }

    const error = new Error(message);
    error.status = status;
    error.errorCode = typeof data?.errorCode === "string" ? data.errorCode : undefined;
    return Promise.reject(error);
  }
);

export default api;
