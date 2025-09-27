import React, { useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { EnhancedQRCode } from './components';
import DynamicQRCode from './components/DynamicQRCode';
import DynamicLinksList from './components/DynamicLinksList';
import DynamicLinkForm from './components/DynamicLinkForm';
import Dashboard from './components/dashboard/Dashboard';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import MainLayout from './components/layout/MainLayout';
import { AuthProvider, useAuth } from './components/auth/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import theme from './theme';
import GlobalStyles from './styles/GlobalStyles';
import './components/EnhancedQRCode.css';

// Main App Layout Component
const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setNavigate } = useAuth();

  // Set up navigation callback
  useEffect(() => {
    if (setNavigate) {
      setNavigate(navigate);
    }
  }, [navigate, setNavigate]);

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};

// Protected Route Wrapper
const ProtectedRouteWrapper = ({ children }) => {
  return <ProtectedRoute>{children}</ProtectedRoute>;
};

// Create the router configuration
const router = createBrowserRouter([{
  element: <AppLayout />,
  children: [
    {
      path: "/",
      element: <EnhancedQRCode />,
    },
    {
      path: "/login",
      element: <Login />,
    },
    {
      path: "/signup",
      element: <Signup />,
    },
    {
      path: "/dashboard",
      element: <ProtectedRouteWrapper><Dashboard /></ProtectedRouteWrapper>,
    },
    {
      path: "/dynamic",
      element: <DynamicQRCode />,
      children: [
        { index: true, element: null },
        { 
          path: "new",
          element: <DynamicLinkForm />,
        },
        { 
          path: ":id",
          element: <DynamicLinkForm />,
        },
      ],
    },
    {
      path: "/dynamic-links",
      element: <DynamicLinksList />,
    },
    {
      path: "*",
      element: <div>404 - Page Not Found</div>,
    },
  ],
}], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

function App() {
  return (
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles />
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}

export default App;
