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
  // MOCK USER FOR TESTING - Comment/uncomment to enable/disable auth
  const [user, setUser] = useState({
    id: 'test-user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    handle: 'testuser',
    avatar: 'https://ui-avatars.com/api/?name=Test+User&background=6366f1&color=fff',
    role: 'user',
    created_date: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // REAL AUTH CODE (Commented out for testing)
  /*
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    initializeGoogleSignIn();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await api.users.getCurrent();
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const initializeGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID',
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
        full_name: payload.name,
        google_id: payload.sub,
        avatar: payload.picture,
        email_verified: payload.email_verified,
        provider: 'google',
        role: 'user',
        created_date: new Date().toISOString()
      };

      try {
        // Check if user exists
        const existingUser = await api.users.getById(payload.sub);
        if (existingUser) {
          setUser(existingUser);
        } else {
          const newUser = await api.users.register(userData);
          setUser(newUser);
        }
        setIsAuthenticated(true);
      } catch (error) {
        // Create new user if doesn't exist
        const newUser = await api.users.register(userData);
        setUser(newUser);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.users.login({ email, password });
      if (response.token) {
        setUser(response.user);
        localStorage.setItem('authToken', response.token);
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
      const response = await api.users.register(userData);
      if (response.token) {
        setUser(response.user);
        localStorage.setItem('authToken', response.token);
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
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    loginWithGoogle,
    logout,
    isAuthenticated: !!user
  };
  */

  // MOCK AUTH FUNCTIONS FOR TESTING
  const login = async (email, password) => {
    console.log('Mock login:', email);
    return true;
  };

  const register = async (userData) => {
    console.log('Mock register:', userData);
    return true;
  };

  const loginWithGoogle = () => {
    console.log('Mock Google login');
  };

  const logout = () => {
    console.log('Mock logout');
    // Uncomment below lines to actually logout for testing
    // setUser(null);
    // setIsAuthenticated(false);
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    loginWithGoogle,
    logout,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
