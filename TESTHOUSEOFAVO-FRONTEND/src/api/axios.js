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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err?.response?.data?.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default api;
