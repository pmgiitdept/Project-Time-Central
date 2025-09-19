// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        if (refresh) {
          const res = await axios.post("http://127.0.0.1:8000/api/token/refresh/", {
            refresh,
          });
          localStorage.setItem("access_token", res.data.access);
          error.config.headers.Authorization = `Bearer ${res.data.access}`;
          return api(error.config);
        }
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        localStorage.clear();
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export default api;