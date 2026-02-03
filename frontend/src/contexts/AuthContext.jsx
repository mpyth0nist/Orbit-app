import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/apiClient';

export const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
    initializeGoogleSignIn();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const userData = await api.users.getCurrent();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID', // TODO: Move to env variable
        callback: handleGoogleSignIn,
        auto_select: false,
      });
    }
  };

  const handleGoogleSignIn = async (response) => {
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));

      const userData = {
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name,
        google_id: payload.sub,
        avatar: payload.picture,
        email_verified: payload.email_verified,
        provider: 'google',
        role: 'user',
        created_date: new Date().toISOString()
      };

      // Note: Backend google auth support needs to be verified.
      // For now, this logic assumes a similar flow to what was mocked, 
      // but ideally should verify with a backend endpoint.
      console.log('Google Sign-In Payload:', userData);
      // Placeholder for actual google login implementation
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.auth.login({ email, password });
      // Response structure: { user: {...}, token: '...' }
      if (response.token) {
        localStorage.setItem('authToken', response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.auth.register(userData);
      // Response structure: { user: {...}, token: '...' }
      // If registration is successful, automatically log in
      if (response && response.token) {
        localStorage.setItem('authToken', response.token);
        setUser(response.user);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const loginWithGoogle = async () => {
    try {
      if (window.google) {
        window.google.accounts.id.prompt((response) => {
          if (response) {
            handleGoogleSignIn(response);
          }
        });
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('authToken');
    // Optional: api.auth.logout() if backend supports invalidating tokens
  };

  const value = React.useMemo(() => ({
    user,
    setUser,
    isLoading,
    login,
    register,
    loginWithGoogle,
    logout,
    isAuthenticated
  }), [user, isLoading, isAuthenticated]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
