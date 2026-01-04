// API Configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const API_ENDPOINTS = {
  // Auth endpoints
  SIGNUP: `${API_BASE_URL}/auth/signup/`,
  LOGIN: `${API_BASE_URL}/auth/login/`,
  GOOGLE_AUTH: `${API_BASE_URL}/auth/google/`,
  LOGOUT: `${API_BASE_URL}/auth/logout/`,
  TOKEN_REFRESH: `${API_BASE_URL}/auth/token/refresh/`,
  PROFILE: `${API_BASE_URL}/auth/profile/`,
  CHANGE_PASSWORD: `${API_BASE_URL}/auth/change-password/`,
  FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password/`,
  RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password/`,
  VALIDATE_RESET_TOKEN: `${API_BASE_URL}/auth/validate-reset-token/`,
  SET_PASSWORD: `${API_BASE_URL}/auth/set-password/`,
  
  // Dashboard
  DASHBOARD: `${API_BASE_URL}/dashboard/`,
  
  // Transactions
  TRANSACTIONS: `${API_BASE_URL}/transactions/`,
  
  // Categories
  CATEGORIES: `${API_BASE_URL}/categories/`,
  
  // Budgets
  BUDGETS: `${API_BASE_URL}/budgets/`,
  BUDGET_OVERVIEW: `${API_BASE_URL}/budgets/overview/`,
  
  // Notifications
  NOTIFICATIONS: `${API_BASE_URL}/notifications/`,
  NOTIFICATIONS_COUNT: `${API_BASE_URL}/notifications/count/`,
  NOTIFICATIONS_MARK_READ: `${API_BASE_URL}/notifications/mark-read/`,
  
  // Analytics
  ANALYTICS: `${API_BASE_URL}/analytics/`,
  ANALYTICS_RANGE: `${API_BASE_URL}/analytics/range/`,
};

export const GOOGLE_CLIENT_ID = '386101218880-k70o0oo8o1hd80arli5h97hnf098ssne.apps.googleusercontent.com';

export default API_BASE_URL;
