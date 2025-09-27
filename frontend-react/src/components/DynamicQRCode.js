import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  IconButton,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  CircularProgress
} from '@mui/material';
import { 
  Download as DownloadIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';

const DynamicQRCode = () => {
  const navigate = useNavigate();
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [deleteId, setDeleteId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    isActive: true,
    androidUrl: '',
    iosUrl: '',
    websiteUrl: ''
  });

  // Use environment variable with fallback to development URL
  const apiBaseUrl = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  }, []);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  }, []);

  const fetchQRCodes = useCallback(async () => {
    try {
      setLoading(true);
      const apiUrl = getApiUrl('/dynamic_qr');
      console.log('Fetching QR codes from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }

      const data = await response.json();
      console.log('QR codes data:', data);
      
      // Ensure we have a valid array before setting state
      if (Array.isArray(data)) {
        setQrCodes(data);
      } else {
        console.warn('Unexpected response format:', data);
        setQrCodes([]);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      showSnackbar(`Failed to load QR codes: ${error.message}`, 'error');
      setQrCodes([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, showSnackbar]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' || type === 'switch' ? checked : value
    }));
  };

  const handleDestinationChange = (index, field, value) => {
    const updatedDestinations = [...formData.destinations];
    
    if (field === 'isDefault' && value) {
      // If setting as default, unset any other default destinations
      updatedDestinations.forEach(dest => {
        dest.isDefault = false;
      });
    }
    
    updatedDestinations[index] = {
      ...updatedDestinations[index],
      [field]: value
    };
    
    setFormData(prev => ({
      ...prev,
      destinations: updatedDestinations
    }));
  };

  const addDestination = () => {
    setFormData(prev => ({
      ...prev,
      destinations: [
        ...prev.destinations,
        {
          id: uuidv4(),
          url: '',
          os: '',
          isDefault: false
        }
      ]
    }));
  };

  const removeDestination = (index) => {
    if (formData.destinations.length <= 1) return;
    
    const updatedDestinations = [...formData.destinations];
    updatedDestinations.splice(index, 1);
    
    // If we removed the default and there are still destinations, set the first one as default
    if (updatedDestinations.length > 0 && !updatedDestinations.some(d => d.isDefault)) {
      updatedDestinations[0].isDefault = true;
    }
    
    setFormData(prev => ({
      ...prev,
      destinations: updatedDestinations
    }));
  };

  // Add useEffect hooks at the component level
  // Test API connection using the health check endpoint
  const testAPIConnection = useCallback(async () => {
    try {
      // Ensure apiBaseUrl is defined and has a value
      if (!apiBaseUrl) {
        const errorMsg = 'API base URL is not defined. Please check your environment configuration.';
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Use the API base URL directly since we already cleaned it up
      const healthCheckUrl = `${apiBaseUrl}/health`;
      console.log('API Base URL:', apiBaseUrl);
      console.log('Health Check URL:', healthCheckUrl);
      
      console.log('Testing API connection to:', healthCheckUrl);
      
      let response;
      try {
        console.log('Sending request to:', healthCheckUrl);
        response = await fetch(healthCheckUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          // Removed credentials for health check as it's not needed
          mode: 'cors' // Explicitly enable CORS mode
        });
        console.log('Response status:', response.status);
      } catch (fetchError) {
        console.error('Network error when trying to reach the API:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack
        });
        throw new Error(`Cannot connect to the API server at ${healthCheckUrl}. Please ensure the backend is running. Error: ${fetchError.message}`);
      }
      
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
          // Try to parse as JSON if possible
          try {
            errorText = JSON.parse(errorText);
          } catch (e) {
            // If not JSON, keep as text
          }
        } catch (e) {
          errorText = 'Could not read error response';
        }
        
        console.error('API Health Check Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          response: errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('API Health Check Response:', {
        data,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      return true;
    } catch (error) {
      console.error('API Connection Error:', error);
      showSnackbar(`Failed to connect to the API server (${apiBaseUrl}). Please ensure the backend is running and the URL is correct. Error: ${error.message}`, 'error');
      return false;
    }
  }, [apiBaseUrl, showSnackbar]);
  
  // Get the correct API URL based on environment
  const getApiUrl = (endpoint) => {
    // Remove any trailing slashes from base URL
    const baseUrl = apiBaseUrl.replace(/\/+$/, '');
    // Add leading slash to endpoint if not present
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${normalizedEndpoint}`;
  };

  // Get the public URL for redirection
  const getPublicUrl = (shortCode) => {
    // This points to the backend's redirect endpoint which will handle device detection
    return `${process.env.REACT_APP_API_URL || window.location.origin}/r/${shortCode}`;
  };

  // Memoize the initialize function
  const initialize = useCallback(async () => {
    console.log('Testing API connection...');
    const isApiAvailable = await testAPIConnection();
    console.log('API available:', isApiAvailable);
    
    if (isApiAvailable) {
      console.log('Fetching QR codes...');
      try {
        await fetchQRCodes();
        console.log('QR codes fetched successfully');
      } catch (error) {
        console.error('Error fetching QR codes:', error);
        showSnackbar('Failed to fetch QR codes. Please try again.', 'error');
      }
    } else {
      console.log('Skipping QR code fetch - API not available');
      setLoading(false); // Ensure loading is set to false if API is not available
    }
  }, [testAPIConnection, fetchQRCodes, showSnackbar]);

  // Track if the component is mounted
  const isMounted = useRef(true);

  useEffect(() => {
    console.log('useEffect triggered, loading:', loading, 'qrCodes length:', qrCodes.length);
    
    // Run initialization when component mounts
    const init = async () => {
      if (isMounted.current) {
        await initialize();
      }
    };
    
    // Only run the initialization if we have no data
    if (qrCodes.length === 0) {
      init();
    }
    
    // Cleanup function
    return () => {
      console.log('Cleaning up...');
      isMounted.current = false;
    };
  }, []); // Empty dependency array to run only once on mount
  
  // Generate a unique ID for the QR code
  const generateShortCode = () => {
    return Math.random().toString(36).substr(2, 8);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading) return;
    
    // Basic validation
    if (!formData.name.trim()) {
      showSnackbar('Please enter a name for the QR code', 'error');
      return;
    }

    // Ensure at least one URL is provided
    if (!formData.androidUrl.trim() && !formData.iosUrl.trim() && !formData.websiteUrl.trim()) {
      showSnackbar('Please provide at least one URL (Android, iOS, or Website)', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Generate a unique short code for this QR code
      const shortCode = generateShortCode();
      
      // Prepare the data to be sent to the API
      const destinations = [];
      
      if (formData.androidUrl.trim()) {
        destinations.push({
          url: formData.androidUrl.trim(),
          os: 'android',
          isDefault: false
        });
      }
      
      if (formData.iosUrl.trim()) {
        destinations.push({
          url: formData.iosUrl.trim(),
          os: 'ios',
          isDefault: false
        });
      }
      
      // Always add website URL as fallback
      if (formData.websiteUrl.trim()) {
        destinations.push({
          url: formData.websiteUrl.trim(),
          os: 'web',
          isDefault: true
        });
      }
      
      const requestData = {
        name: formData.name.trim(),
        isActive: formData.isActive,
        short_code: shortCode,
        destinations: destinations
      };

      console.log('Sending QR data:', requestData);

      const url = editingId 
        ? `${apiBaseUrl}/dynamic_qr/${editingId}`
        : `${apiBaseUrl}/dynamic_qr`;
      
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.detail || 'Failed to save QR code');
      }

      const result = await response.json();
      console.log('Server response:', result);

      // Update the local state with the new/updated QR code
      if (editingId) {
        setQrCodes(prev => 
          prev.map(qr => qr.id === editingId ? { ...qr, ...result } : qr)
        );
      } else {
        setQrCodes(prev => [result, ...prev]);
      }

      showSnackbar(
        editingId ? 'QR Code updated successfully!' : 'QR Code created successfully!',
        'success'
      );
      
      // Reset form
      resetForm();
      setEditingId(null); // Clear editing ID after successful submission
    } catch (error) {
      console.error('Error saving QR code:', error);
      showSnackbar(`Failed to save QR code: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (qrCode) => {
    // Extract URLs from destinations if they exist
    const androidDest = qrCode.destinations?.find(d => d.os === 'android');
    const iosDest = qrCode.destinations?.find(d => d.os === 'ios');
    const webDest = qrCode.destinations?.find(d => d.os === '' || d.os === 'web');
    
    setFormData({
      name: qrCode.name,
      isActive: qrCode.isActive,
      androidUrl: androidDest?.url || '',
      iosUrl: iosDest?.url || '',
      websiteUrl: webDest?.url || ''
    });
    setEditingId(qrCode.id);
    // Scroll to top when editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = useCallback(async (id) => {
    if (!id) {
      console.error('Cannot delete: No ID provided');
      showSnackbar('Error: Cannot delete QR code - missing ID', 'error');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this QR code? This action cannot be undone.')) {
      setLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/dynamic_qr/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to delete QR code');
        }
        
        // Remove the deleted QR code from the list
        setQrCodes(prev => prev.filter(qr => (qr.id || qr._id) !== id));
        showSnackbar('QR code deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting QR code:', error);
        showSnackbar('Failed to delete QR code', 'error');
      } finally {
        setLoading(false);
      }
    }
  }, [apiBaseUrl, showSnackbar]);

  const downloadQRCode = (shortCode) => {
    const canvas = document.getElementById(`qr-${shortCode}`);
    if (canvas) {
      canvas.toBlob((blob) => {
        saveAs(blob, `qrcode-${shortCode}.png`);
      });
    }
  };

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text);
    showSnackbar('Copied to clipboard', 'success');
  }, [showSnackbar]);


  const resetForm = () => {
    setFormData({
      name: '',
      isActive: true,
      androidUrl: '',
      iosUrl: '',
      websiteUrl: ''
    });
    setEditingId(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Left Column - Create/Edit Form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h5" gutterBottom>
              {editingId ? 'Edit QR Code' : 'Create New QR Code'}
            </Typography>
            
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                variant="outlined"
                margin="normal"
                required
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    height: '56px',
                    '& fieldset': {
                      border: '1px solid rgba(0, 0, 0, 0.23)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.87)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                      borderWidth: '1px',
                    },
                  },
                  '& .MuiInputLabel-outlined': {
                    transform: 'translate(14px, 18px) scale(1)',
                    '&.MuiInputLabel-shrink': {
                      transform: 'translate(14px, -6px) scale(0.75)',
                      backgroundColor: 'background.paper',
                      px: 0.5,
                      ml: 0.5,
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '16.5px 14px',
                  },
                }}
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange({
                      target: { 
                        name: 'isActive', 
                        checked: e.target.checked,
                        type: 'switch'
                      }
                    })}
                    color="primary"
                  />
                }
                label={formData.isActive ? 'Active' : 'Inactive'}
                sx={{ 
                  display: 'flex',
                  alignItems: 'center',
                  mb: 4,
                  mt: 2,
                  '& .MuiFormControlLabel-label': {
                    ml: 1,
                  }
                }}
              />
              
              <Typography variant="h6" sx={{ mb: 3, mt: 5, fontWeight: 500 }}>
                App Store Links
              </Typography>
              
              <TextField
                fullWidth
                label="Android App URL"
                name="androidUrl"
                value={formData.androidUrl}
                onChange={handleInputChange}
                variant="outlined"
                margin="normal"
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    height: '56px',
                    '& fieldset': {
                      border: '1px solid rgba(0, 0, 0, 0.23)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.87)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                      borderWidth: '1px',
                    },
                  },
                  '& .MuiInputLabel-outlined': {
                    transform: 'translate(14px, 18px) scale(1)',
                    '&.MuiInputLabel-shrink': {
                      transform: 'translate(14px, -6px) scale(0.75)',
                      backgroundColor: 'background.paper',
                      px: 0.5,
                      ml: 0.5,
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '16.5px 14px',
                  },
                }}
              />
              
              <TextField
                fullWidth
                label="iOS App URL"
                name="iosUrl"
                value={formData.iosUrl}
                onChange={handleInputChange}
                variant="outlined"
                margin="normal"
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    height: '56px',
                    '& fieldset': {
                      border: '1px solid rgba(0, 0, 0, 0.23)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.87)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                      borderWidth: '1px',
                    },
                  },
                  '& .MuiInputLabel-outlined': {
                    transform: 'translate(14px, 18px) scale(1)',
                    '&.MuiInputLabel-shrink': {
                      transform: 'translate(14px, -6px) scale(0.75)',
                      backgroundColor: 'background.paper',
                      px: 0.5,
                      ml: 0.5,
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '16.5px 14px',
                  },
                }}
              />
              
              <TextField
                fullWidth
                label="Website URL (Fallback)"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleInputChange}
                variant="outlined"
                margin="normal"
                required
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    height: '56px',
                    '& fieldset': {
                      border: '1px solid rgba(0, 0, 0, 0.23)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(0, 0, 0, 0.87)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: 'primary.main',
                      borderWidth: '1px',
                    },
                  },
                  '& .MuiInputLabel-outlined': {
                    transform: 'translate(14px, 18px) scale(1)',
                    '&.MuiInputLabel-shrink': {
                      transform: 'translate(14px, -6px) scale(0.75)',
                      backgroundColor: 'background.paper',
                      px: 0.5,
                      ml: 0.5,
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    padding: '16.5px 14px',
                  },
                }}
              />
              
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={resetForm}
                  sx={{ mr: 2 }}
                  startIcon={<CancelIcon />}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  disabled={loading}
                  startIcon={editingId ? <SaveIcon /> : <AddIcon />}
                >
                  {editingId ? 'Update' : 'Create'} QR Code
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>

        {/* Right Column - QR Codes List */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5">My QR Codes</Typography>
            </Box>
            
            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : qrCodes.length === 0 ? (
              <Box textAlign="center" py={4} width="100%">
                <Typography variant="body1" color="textSecondary" gutterBottom>
                  No QR codes found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Create your first QR code using the form on the left
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {qrCodes.map((qrCode) => {
                  const qrKey = qrCode.id || qrCode._id || `qr-${Math.random().toString(36).substr(2, 9)}`;
                  return (
                    <Grid item xs={12} key={qrKey}>
                      <Card>
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={3}>
                              <QRCodeSVG
                                value={qrCode.short_code ? getPublicUrl(qrCode.short_code) : 
                                      (qrCode.destinations?.find(d => d.os === 'android')?.url || 
                                       qrCode.destinations?.find(d => d.isDefault)?.url || 
                                       qrCode.destinations?.[0]?.url || 
                                       'https://example.com')}
                                size={100}
                                level="H"
                                includeMargin={true}
                                style={{
                                  width: '100%',
                                  height: 'auto',
                                  maxWidth: '100px',
                                  display: 'block',
                                  margin: '0 auto'
                                }}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="subtitle1" noWrap>
                                {qrCode.name}
                              </Typography>
                              <Typography variant="body2" color="textSecondary" noWrap>
                                {qrCode.short_code ? getPublicUrl(qrCode.short_code) : 
                                 (qrCode.destinations?.find(d => d.isDefault)?.url || 
                                  qrCode.destinations?.[0]?.url || 
                                  'No URL')}
                              </Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                                {qrCode.destinations?.map((dest, idx) => (
                                  <Chip 
                                    key={`${qrKey}-dest-${idx}`}
                                    label={dest.os || 'web'}
                                    size="small"
                                    color={dest.isDefault ? 'primary' : 'default'}
                                    variant={dest.isDefault ? 'filled' : 'outlined'}
                                  />
                                ))}
                              </Box>
                              <Box sx={{ display: 'flex', mt: 1 }}>
                                <Chip 
                                  label={qrCode.isActive ? 'Active' : 'Inactive'} 
                                  color={qrCode.isActive ? 'success' : 'default'} 
                                  size="small"
                                  sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                                <Typography variant="caption" color="textSecondary" sx={{ ml: 1, alignSelf: 'center' }}>
                                  {new Date(qrCode.createdAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={3} sx={{ textAlign: 'right' }}>
                              <IconButton 
                                size="small" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(qrCode);
                                }}
                                title="Edit"
                                color="primary"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadQRCode(qrCode.short_code || qrCode.id);
                                }}
                                title="Download"
                                color="primary"
                              >
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(qrCode.id || qrCode._id);
                                }}
                                title="Delete"
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
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
    </Box>
  );
};

export default DynamicQRCode;
