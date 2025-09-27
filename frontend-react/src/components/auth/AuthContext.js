import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [navigateCallback, setNavigateCallback] = useState(null);
  const [locationState, setLocationState] = useState({});

  // Set the navigate callback from the component that has access to useNavigate
  const setNavigate = useCallback((navigate, location) => {
    setNavigateCallback(() => navigate);
    setLocationState(location);
  }, []);

  // Check for existing session on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Skip auth check if we're in development and the endpoint doesn't exist
        if (process.env.NODE_ENV === 'development') {
          console.log('Skipping auth check in development mode');
          setUser({ id: 'demo-user', name: 'Demo User' }); // Set a demo user for development
        } else {
          const response = await axios.get('/api/auth/me', { 
            withCredentials: true,
            // Don't show error for 404 responses
            validateStatus: status => status === 200 || status === 401
          });
          if (response.status === 200) {
            setUser(response.data.user);
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        console.warn('Auth check failed:', error.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password }, { withCredentials: true });
      setUser(response.data.user);
      
      // Use the navigate callback if available
      if (navigateCallback) {
        const to = locationState.state?.from?.pathname || '/';
        navigateCallback(to, { replace: true });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  }, [navigateCallback, locationState]);

  const register = useCallback(async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData, { withCredentials: true });
      setUser(response.data.user);
      
      // Use the navigate callback if available
      if (navigateCallback) {
        navigateCallback('/', { replace: true });
      }
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Registration failed' };
    }
  }, [navigateCallback]);

  const logout = useCallback(async () => {
    try {
      await axios.post('/api/auth/logout', {}, { withCredentials: true });
    } finally {
      setUser(null);
      
      // Use the navigate callback if available
      if (navigateCallback) {
        navigateCallback('/');
      }
    }
  }, [navigateCallback]);

  const value = React.useMemo(() => ({
    isAuthenticated: !!user,
    user,
    loading,
    login,
    register,
    logout,
    setNavigate // Expose setNavigate to be called by a component with router access
  }), [user, loading, login, register, logout, setNavigate]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
