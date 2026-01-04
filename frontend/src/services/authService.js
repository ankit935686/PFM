import api from './api';
import { API_ENDPOINTS } from '../config/api';

export const authService = {
  // Signup with email, username, password
  signup: async (email, username, password, passwordConfirm) => {
    const response = await api.post(API_ENDPOINTS.SIGNUP, {
      email,
      username,
      password,
      password_confirm: passwordConfirm,
    });
    return response.data;
  },

  // Login with email and password
  login: async (email, password) => {
    const response = await api.post(API_ENDPOINTS.LOGIN, {
      email,
      password,
    });
    return response.data;
  },

  // Google OAuth login
  googleAuth: async (token) => {
    const response = await api.post(API_ENDPOINTS.GOOGLE_AUTH, {
      token,
    });
    return response.data;
  },

  // Logout
  logout: async () => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    try {
      await api.post(API_ENDPOINTS.LOGOUT, {
        refresh: tokens.refresh,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('tokens');
    localStorage.removeItem('user');
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get(API_ENDPOINTS.PROFILE);
    return response.data;
  },

  // Update user profile
  updateProfile: async (data) => {
    const response = await api.patch(API_ENDPOINTS.PROFILE, data);
    return response.data;
  },

  // Change password
  changePassword: async (oldPassword, newPassword, newPasswordConfirm) => {
    const response = await api.post(API_ENDPOINTS.CHANGE_PASSWORD, {
      old_password: oldPassword,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });
    return response.data;
  },

  // Forgot password - request reset email
  forgotPassword: async (email) => {
    const response = await api.post(API_ENDPOINTS.FORGOT_PASSWORD, { email });
    return response.data;
  },

  // Validate reset token
  validateResetToken: async (token) => {
    const response = await api.get(`${API_ENDPOINTS.VALIDATE_RESET_TOKEN}${token}/`);
    return response.data;
  },

  // Reset password with token
  resetPassword: async (token, newPassword, newPasswordConfirm) => {
    const response = await api.post(API_ENDPOINTS.RESET_PASSWORD, {
      token,
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });
    return response.data;
  },

  // Set password (for Google users)
  setPassword: async (newPassword, newPasswordConfirm) => {
    const response = await api.post(API_ENDPOINTS.SET_PASSWORD, {
      new_password: newPassword,
      new_password_confirm: newPasswordConfirm,
    });
    return response.data;
  },

  // Get dashboard data (month-aware)
  getDashboard: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.DASHBOARD, { params });
    return response.data;
  },

  // ============================================
  // TRANSACTION METHODS
  // ============================================

  // Get all transactions
  getTransactions: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.TRANSACTIONS, { params });
    return response.data;
  },

  // Create a new transaction
  createTransaction: async (data) => {
    const response = await api.post(API_ENDPOINTS.TRANSACTIONS, data);
    return response.data;
  },

  // Update a transaction
  updateTransaction: async (id, data) => {
    const response = await api.patch(`${API_ENDPOINTS.TRANSACTIONS}${id}/`, data);
    return response.data;
  },

  // Delete a transaction
  deleteTransaction: async (id) => {
    const response = await api.delete(`${API_ENDPOINTS.TRANSACTIONS}${id}/`);
    return response.data;
  },

  // ============================================
  // CATEGORY METHODS
  // ============================================

  // Get all categories
  getCategories: async () => {
    const response = await api.get(API_ENDPOINTS.CATEGORIES);
    return response.data;
  },

  // Create a new category
  createCategory: async (data) => {
    const response = await api.post(API_ENDPOINTS.CATEGORIES, data);
    return response.data;
  },

  // ============================================
  // BUDGET METHODS
  // ============================================

  // Get all budgets
  getBudgets: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.BUDGETS, { params });
    return response.data;
  },

  // Create a new budget
  createBudget: async (data) => {
    const response = await api.post(API_ENDPOINTS.BUDGETS, data);
    return response.data;
  },

  // Update a budget
  updateBudget: async (id, data) => {
    const response = await api.patch(`${API_ENDPOINTS.BUDGETS}${id}/`, data);
    return response.data;
  },

  // Delete a budget
  deleteBudget: async (id) => {
    const response = await api.delete(`${API_ENDPOINTS.BUDGETS}${id}/`);
    return response.data;
  },

  // Get budget overview (month-aware)
  getBudgetOverview: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.BUDGET_OVERVIEW, { params });
    return response.data;
  },

  // ============================================
  // NOTIFICATION METHODS
  // ============================================

  // Get all notifications
  getNotifications: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.NOTIFICATIONS, { params });
    return response.data;
  },

  // Get unread notification count
  getNotificationCount: async () => {
    const response = await api.get(API_ENDPOINTS.NOTIFICATIONS_COUNT);
    return response.data;
  },

  // Mark notifications as read
  markNotificationsRead: async (data) => {
    const response = await api.post(API_ENDPOINTS.NOTIFICATIONS_MARK_READ, data);
    return response.data;
  },

  // Delete a notification
  deleteNotification: async (id) => {
    const response = await api.delete(`${API_ENDPOINTS.NOTIFICATIONS}${id}/`);
    return response.data;
  },

  // ============================================
  // ANALYTICS METHODS
  // ============================================

  // Get analytics data (month-aware)
  getAnalytics: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.ANALYTICS, { params });
    return response.data;
  },

  // Get analytics data for flexible date range
  getAnalyticsRange: async (params = {}) => {
    const response = await api.get(API_ENDPOINTS.ANALYTICS_RANGE, { params });
    return response.data;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const tokens = JSON.parse(localStorage.getItem('tokens') || '{}');
    return !!tokens.access;
  },

  // Get stored user
  getStoredUser: () => {
    return JSON.parse(localStorage.getItem('user') || 'null');
  },

  // Save auth data to localStorage
  saveAuthData: (user, tokens) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tokens', JSON.stringify(tokens));
  },
};

export default authService;
