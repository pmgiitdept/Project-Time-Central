// src/api.js
import axios from "axios";

// ✅ Detect environment
const isLocalhost = window.location.hostname === "localhost";

// ✅ Use local backend when developing, otherwise use your deployed backend
const baseURL = isLocalhost
  ? "http://127.0.0.1:8000/api/"
  : "https://project-time-central.onrender.com/api/";

const api = axios.create({
  baseURL,
});

// 🔑 Attach access token to every request
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

// 🔄 Auto-refresh token if expired
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        if (refresh) {
          // ✅ Call your Django refresh endpoint
          const res = await axios.post(`${baseURL}auth/token/refresh/`, {
            refresh,
          });
          localStorage.setItem("access_token", res.data.access);
          error.config.headers.Authorization = `Bearer ${res.data.access}`;
          return api(error.config); // retry original request
        }
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        localStorage.clear();
        window.location.href = "/"; // force login again
      }
    }
    return Promise.reject(error);
  }
);

export default api;
