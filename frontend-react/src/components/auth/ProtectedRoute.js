import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page with a message and return URL
    return (
      <Navigate
        to="/login"
        state={{
          from: location,
          message: "Dynamic QR Codes let you edit destinations and track scans. Please sign up or log in to continue."
        }}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
