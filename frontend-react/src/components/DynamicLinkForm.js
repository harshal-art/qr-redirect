import React, { useState, useEffect } from 'react';
import { 
  Container, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Grid, 
  IconButton,
  Box,
  Snackbar,
  Alert
} from '@mui/material';
import { ContentCopy, ArrowBack } from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
});

const DynamicLinkForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [generatedLink, setGeneratedLink] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [formData, setFormData] = useState({
    name: '',
    android_url: '',
    ios_url: '',
    fallback_url: ''
  });

  useEffect(() => {
    if (isEditMode) {
      fetchLink();
    }
  }, [id, isEditMode, fetchLink]);

  const fetchLink = async () => {
    try {
      const response = await api.get(`/dynamic-links/${id}`);
      setFormData({
        name: response.data.name,
        android_url: response.data.android_url || '',
        ios_url: response.data.ios_url || '',
        fallback_url: response.data.fallback_url || ''
      });
    } catch (error) {
      console.error('Error fetching link:', error);
      showSnackbar('Failed to load link', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showSnackbar('Please enter a name for the link', 'error');
      return;
    }
    
    try {
      if (isEditMode) {
        await api.put(`/dynamic-links/${id}`, formData);
        showSnackbar('Link updated successfully');
      } else {
        const response = await api.post('/dynamic-links/', formData);
        showSnackbar('Link created successfully');
        setGeneratedLink(`${window.location.origin}/d/${response.data.short_code}`);
        setShowQrCode(true);
      }
    } catch (error) {
      console.error('Error saving link:', error);
      showSnackbar(error.response?.data?.detail || 'Failed to save link', 'error');
    }
  };


  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSnackbar('Copied to clipboard');
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={() => navigate('/dynamic-links')} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4">
          {isEditMode ? 'Edit Dynamic Link' : 'Create New Dynamic Link'}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Link Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Android App URL"
                    name="android_url"
                    value={formData.android_url}
                    onChange={handleChange}
                    placeholder="https://play.google.com/store/apps/..."
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="iOS App URL"
                    name="ios_url"
                    value={formData.ios_url}
                    onChange={handleChange}
                    placeholder="https://apps.apple.com/app/..."
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Fallback URL"
                    name="fallback_url"
                    value={formData.fallback_url}
                    onChange={handleChange}
                    placeholder="https://example.com"
                    margin="normal"
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary"
                    size="large"
                    fullWidth
                  >
                    {isEditMode ? 'Update Link' : 'Create Link'}
                  </Button>
                </Grid>
              </Grid>
            </form>

            {showQrCode && generatedLink && (
              <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Your Dynamic Link QR Code
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <QRCodeSVG 
                    value={generatedLink} 
                    size={200} 
                    level="H"
                    includeMargin={true}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body1" sx={{ mr: 1, wordBreak: 'break-all' }}>
                    {generatedLink}
                  </Typography>
                  <IconButton 
                    size="small" 
                    onClick={() => copyToClipboard(generatedLink)}
                    title="Copy to clipboard"
                  >
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DynamicLinkForm;
