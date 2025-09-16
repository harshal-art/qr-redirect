import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Container, 
  IconButton, 
  useScrollTrigger, 
  Slide, 
  Tooltip,
  ClickAwayListener
} from '@mui/material';
import { FiMenu, FiGlobe, FiMail, FiPhone, FiCopy } from 'react-icons/fi';
import { FaLinkedin } from 'react-icons/fa';

function HideOnScroll({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const trigger = useScrollTrigger();
  
  // Close mobile menu when route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  );
}

function MainLayout() {
  const location = useLocation();
  const [tooltipOpen, setTooltipOpen] = useState({
    phone: false,
    email: false
  });

  const handleTooltipOpen = (type) => {
    setTooltipOpen(prev => ({
      ...prev,
      [type]: true
    }));
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      setTooltipOpen(prev => ({
        ...prev,
        [type]: false
      }));
    }, 3000);
  };

  const handleTooltipClose = (type) => {
    setTooltipOpen(prev => ({
      ...prev,
      [type]: false
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <HideOnScroll>
        <AppBar 
          position="fixed" 
          elevation={0}
          sx={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            color: 'text.primary',
          }}
        >
          <Container maxWidth={false} sx={{ padding: 0, margin: 0, maxWidth: '100%' }}>
            <Toolbar disableGutters sx={{ minHeight: '72px', position: 'relative', width: '100%', px: 3 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                width: '100%',
                justifyContent: 'center'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <a 
                    href="https://www.datavoice.co.in/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      textDecoration: 'none',
                      position: 'fixed',
                      left: '24px',
                      top: '16px',
                      zIndex: 1300, // Higher than AppBar's z-index
                      gap: '8px' // Space between logo and text
                    }}
                  >
                    <img 
                      src="/logo.jpg" 
                      alt="QRet Logo" 
                      style={{ 
                        height: '40px', 
                        width: 'auto',
                        maxWidth: '150px',
                        objectFit: 'contain'
                      }} 
                    />
                    <Typography
                      variant="h5"
                      component="span"
                      sx={{
                        fontWeight: 800,
                        lineHeight: 1,
                        '& span:first-of-type': {
                          color: '#eb2c2c', // Logo red
                        },
                        '& span:last-of-type': {
                          color: '#085b88', // Matches logo color
                        },
                        '&:hover': {
                          '& span:first-of-type': {
                            color: '#b20000', // Darker red on hover
                          },
                          '& span:last-of-type': {
                            color: 'text.secondary',
                          },
                        },
                      }}
                    >
                      <span>QR</span><span>et</span>
                    </Typography>
                  </a>
                </Box>
                <Box sx={{ display: { xs: 'none', md: 'flex' }, ml: 4, gap: 2 }}>
                  <Button 
                    component={Link}
                    to="/"
                    sx={{ 
                      color: location?.pathname === '/' ? 'primary.main' : 'inherit',
                      fontWeight: location?.pathname === '/' ? 600 : 500,
                      fontSize: '1rem',
                      padding: '8px 16px',
                      '&:hover': {
                        color: 'primary.main',
                        backgroundColor: 'rgba(29, 78, 216, 0.05)'
                      }
                    }}
                  >
                    Static QR
                  </Button>
                  <Button 
                    component={Link}
                    to="/dynamic"
                    sx={{ 
                      color: location?.pathname === '/dynamic' ? 'primary.main' : 'inherit',
                      fontWeight: location?.pathname === '/dynamic' ? 600 : 500,
                      fontSize: '1rem',
                      padding: '8px 16px',
                      '&:hover': {
                        color: 'primary.main',
                        backgroundColor: 'rgba(29, 78, 216, 0.05)'
                      }
                    }}
                  >
                    Dynamic QR
                  </Button>
                  <Button 
                    component={Link}
                    to="/dynamic-links"
                    sx={{ 
                      color: location?.pathname?.startsWith('/dynamic-links') ? 'primary.main' : 'inherit',
                      fontWeight: location?.pathname?.startsWith('/dynamic-links') ? 600 : 500,
                      fontSize: '1rem',
                      padding: '8px 16px',
                      '&:hover': {
                        color: 'primary.main',
                        backgroundColor: 'rgba(29, 78, 216, 0.05)'
                      }
                    }}
                  >
                    Dynamic Links
                  </Button>
                </Box>
              </Box>
              
              <Box sx={{ 
                position: 'absolute',
                right: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <IconButton 
                  href="https://www.datavoice.co.in/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  size="small"
                  sx={{ 
                    color: 'inherit',
                    '&:hover': {
                      color: '#085b88' // Same blue as LinkedIn hover
                    }
                  }}
                  title="https://www.datavoice.co.in"
                >
                  <FiGlobe />
                </IconButton>
                <IconButton 
                  href="https://www.linkedin.com/company/datavoice-solutions/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  size="small"
                  sx={{ 
                    color: 'inherit',
                    '&:hover': {
                      color: '#0a66c2' // Slightly brighter blue for better visibility
                    }
                  }}
                  title="https://www.linkedin.com/company/datavoice-solutions/"
                >
                  <FaLinkedin />
                </IconButton>
                {/* Email with hover and click tooltip */}
                <Tooltip 
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>info@datavoice.co.in</span>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard('info@datavoice.co.in');
                        }}
                        sx={{ p: 0.5, color: 'white' }}
                      >
                        <FiCopy size={14} />
                      </IconButton>
                    </Box>
                  }
                  arrow
                  placement="bottom"
                  enterTouchDelay={0}
                >
                  <IconButton 
                    component="a"
                    href="mailto:info@datavoice.co.in"
                    size="small"
                    sx={{ 
                      color: 'inherit',
                      '&:hover': {
                        color: '#d44638' // Gmail red color for email
                      }
                    }}
                  >
                    <FiMail />
                  </IconButton>
                </Tooltip>

                {/* Phone with hover and click tooltip */}
                <Tooltip 
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>+91 86552 55211</span>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard('+918655255211');
                        }}
                        sx={{ p: 0.5, color: 'white' }}
                      >
                        <FiCopy size={14} />
                      </IconButton>
                    </Box>
                  }
                  arrow
                  placement="bottom"
                  enterTouchDelay={0}
                >
                  <IconButton 
                    component="a"
                    href="tel:+918655255211"
                    size="small"
                    sx={{ 
                      color: 'inherit',
                      '&:hover': {
                        color: '#34a853' // Green color for phone
                      }
                    }}
                  >
                    <FiPhone />
                  </IconButton>
                </Tooltip>
                <Button 
                  variant="contained" 
                  color="primary" 
                  href="/dynamic"
                  size="small"
                  sx={{ 
                    fontWeight: 600,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    '&:hover': {
                      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  Get Started
                </Button>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>
      </HideOnScroll>
      
      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, pt: '72px' }}>
        <Outlet />
      </Box>
      
      {/* Footer */}
      <Box component="footer" sx={{ py: 3, backgroundColor: 'background.paper', borderTop: '1px solid rgba(0, 0, 0, 0.05)' }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', md: 'flex-start' }, gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                © {new Date().getFullYear()} QRet. All rights reserved.
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                <Button 
                  component="a"
                  href="https://www.datavoice.co.in/terms-conditions"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  sx={{ color: 'text.secondary', textTransform: 'none', minWidth: 'auto', p: 0 }}
                >
                  Terms & Conditions
                </Button>
                <Button 
                  component="a"
                  href="https://www.datavoice.co.in/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  sx={{ color: 'text.secondary', textTransform: 'none', minWidth: 'auto', p: 0 }}
                >
                  Privacy Policy
                </Button>
                <Button 
                  component="a"
                  href="https://www.datavoice.co.in/refund-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  sx={{ color: 'text.secondary', textTransform: 'none', minWidth: 'auto', p: 0 }}
                >
                  Refund Policy
                </Button>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: { xs: 2, md: 0 } }}>
              <IconButton 
                href="https://www.linkedin.com/company/datavoice-solutions/" 
                target="_blank" 
                rel="noopener noreferrer"
                size="small" 
                sx={{ color: 'text.secondary' }}
                title="Visit our LinkedIn"
              >
                <FaLinkedin />
              </IconButton>
              <IconButton 
                href="https://www.datavoice.co.in/" 
                target="_blank" 
                rel="noopener noreferrer"
                size="small" 
                sx={{ color: 'text.secondary' }}
                title="Visit our Website"
              >
                <FiGlobe />
              </IconButton>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}

export default MainLayout;
