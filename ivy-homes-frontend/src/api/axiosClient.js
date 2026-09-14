import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://solve.ivy.homes';
const API_KEY = import.meta.env.VITE_API_KEY;

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor: Attach API Key and Bearer Token
axiosClient.interceptors.request.use((config) => {
  if (API_KEY) {
    config.headers['X-API-Key'] = API_KEY;
  }

  const token = localStorage.getItem('ivy_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response Interceptor: Silent Auto-Refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('ivy_refresh_token');

      // If no refresh token or already retried, force logout
      if (!refreshToken || originalRequest.url.includes('/auth/')) {
        localStorage.removeItem('ivy_token');
        localStorage.removeItem('ivy_refresh_token');
        localStorage.removeItem('ivy_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'X-API-Key': API_KEY } }
        );

        const newToken = res.data.access_token || res.data.token;
        const newRefreshToken = res.data.refresh_token;

        localStorage.setItem('ivy_token', newToken);
        if (newRefreshToken) {
          localStorage.setItem('ivy_refresh_token', newRefreshToken);
        }

        axiosClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;