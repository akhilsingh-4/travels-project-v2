import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const url = typeof config.url === "string" ? config.url : "";
    const authExcludedPaths = [
      "/api/login/",
      "/api/register/",
      "/api/request-otp/",
      "/api/verify-otp/",
      "/api/token/refresh/",
      "/api/forgot-password/",
      "/api/reset-password/",
    ];
    const shouldSkipAuth = authExcludedPaths.some((path) => url.includes(path));
    const access = localStorage.getItem("access");
    if (access && !shouldSkipAuth) {
      config.headers.Authorization = `Bearer ${access}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      localStorage.getItem("refresh")
    ) {
      originalRequest._retry = true;

      try {
        const refresh = localStorage.getItem("refresh");

        const res = await axios.post(
          `${BASE_URL}/api/token/refresh/`,
          { refresh }
        );

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
