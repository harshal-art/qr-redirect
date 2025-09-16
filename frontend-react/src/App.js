import React from 'react';
import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { EnhancedQRCode } from './components';
import DynamicQRCode from './components/DynamicQRCode';
import DynamicLinksList from './components/DynamicLinksList';
import DynamicLinkForm from './components/DynamicLinkForm';
import MainLayout from './components/layout/MainLayout';
import theme from './theme';
import GlobalStyles from './styles/GlobalStyles';
import './components/EnhancedQRCode.css';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<MainLayout />}>
      <Route index element={<EnhancedQRCode />} />
      <Route path="dynamic" element={<DynamicQRCode />} />
      <Route path="dynamic-links" element={<DynamicLinksList />} />
      <Route path="dynamic-links/new" element={<DynamicLinkForm />} />
      <Route path="dynamic-links/:id" element={<DynamicLinkForm />} />
    </Route>
  ),
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}

export default App;
