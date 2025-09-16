import { GlobalStyles as MuiGlobalStyles } from '@mui/material';

const GlobalStyles = () => {
  return (
    <MuiGlobalStyles
      styles={{
        '*': {
          boxSizing: 'border-box',
          margin: 0,
          padding: 0,
        },
        'html, body, #root': {
          height: '100%',
          width: '100%',
        },
        body: {
          backgroundColor: '#F8FAFC',
          color: '#1E293B',
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          lineHeight: 1.5,
        },
        'h1, h2, h3, h4, h5, h6': {
          color: '#0F172A',
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: '1rem',
        },
        'p': {
          marginBottom: '1rem',
          color: '#475569',
        },
        'a': {
          color: '#2563EB',
          textDecoration: 'none',
          '&:hover': {
            textDecoration: 'underline',
          },
        },
        'button, .btn': {
          transition: 'all 0.2s ease',
          '&:focus': {
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.3)',
          },
        },
        'input, textarea, select': {
          '&:focus': {
            outline: 'none',
            boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.3)',
          },
        },
        '::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '::-webkit-scrollbar-track': {
          background: '#F1F5F9',
          borderRadius: '4px',
        },
        '::-webkit-scrollbar-thumb': {
          background: '#CBD5E1',
          borderRadius: '4px',
          '&:hover': {
            background: '#94A3B8',
          },
        },
      }}
    />
  );
};

export default GlobalStyles;
