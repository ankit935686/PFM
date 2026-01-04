import axios from 'axios';
import API_BASE_URL from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    if (tokens.access) {
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
        if (tokens.refresh) {
          const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: tokens.refresh,
          });

          const newTokens = {
            access: response.data.access,
            refresh: response.data.refresh || tokens.refresh,
          };

          localStorage.setItem('tokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed (including 500 errors when user doesn't exist)
        // Clear storage and redirect to login
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        // Only redirect if not already on a public page
        if (!window.location.pathname.match(/^\/(login|signup|forgot-password|reset-password)?$/)) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle 500 errors on token refresh (user deleted)
    if (error.response?.status === 500 && error.config?.url?.includes('token/refresh')) {
      localStorage.removeItem('tokens');
      localStorage.removeItem('user');
      if (!window.location.pathname.match(/^\/(login|signup|forgot-password|reset-password)?$/)) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
