import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth on mount
    const initAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const response = await authService.getProfile();
          setUser(response.user);
        } catch (error) {
          console.error('Failed to fetch profile:', error);
          // Clear invalid tokens
          localStorage.removeItem('tokens');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authService.login(email, password);
    if (response.success) {
      authService.saveAuthData(response.user, response.tokens);
      setUser(response.user);
    }
    return response;
  };

  const signup = async (email, username, password, passwordConfirm) => {
    const response = await authService.signup(email, username, password, passwordConfirm);
    if (response.success) {
      authService.saveAuthData(response.user, response.tokens);
      setUser(response.user);
    }
    return response;
  };

  const googleLogin = async (token) => {
    const response = await authService.googleAuth(token);
    if (response.success) {
      authService.saveAuthData(response.user, response.tokens);
      setUser(response.user);
    }
    return response;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    setUser: updateUser,
    loading,
    login,
    signup,
    googleLogin,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
