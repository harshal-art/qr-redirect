import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
  ContentCopy as CopyIcon, 
  Download as DownloadIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { saveAs } from 'file-saver';
import { v4 as uuidv4 } from 'uuid';

const DynamicQRCode = () => {
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'url',
    isActive: true,
    destinations: [
      {
        id: uuidv4(),
        url: '',
        os: '',
        isDefault: true
      }
    ]
  });

  const apiBaseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  // Fetch QR codes on component mount
  useEffect(() => {
    fetchQRCodes();
  }, []);

  const fetchQRCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/dynamic-qr`);
      if (!response.ok) {
        throw new Error('Failed to fetch QR codes');
      }
      const data = await response.json();
      setQrCodes(data);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      showSnackbar('Failed to load QR codes', 'error');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const url = editingId 
        ? `${apiBaseUrl}/dynamic-qr/${editingId}`
        : `${apiBaseUrl}/dynamic-qr`;
      
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save QR code');
      }
      
      showSnackbar(
        editingId ? 'QR code updated successfully' : 'QR code created successfully',
        'success'
      );
      
      // Reset form and refresh list
      resetForm();
      fetchQRCodes();
      
    } catch (error) {
      console.error('Error saving QR code:', error);
      showSnackbar('Failed to save QR code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (qrCode) => {
    setFormData({
      name: qrCode.name,
      description: qrCode.description || '',
      type: qrCode.type || 'url',
      isActive: qrCode.isActive,
      destinations: qrCode.destinations.length > 0 
        ? qrCode.destinations.map(dest => ({
            ...dest,
            id: dest.id || uuidv4()
          }))
        : [{
            id: uuidv4(),
            url: '',
            os: '',
            isDefault: true
          }]
    });
    setEditingId(qrCode.id);
    // Scroll to top when editing
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this QR code?')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/dynamic-qr/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete QR code');
      }
      
      showSnackbar('QR code deleted successfully', 'success');
      fetchQRCodes();
      
    } catch (error) {
      console.error('Error deleting QR code:', error);
      showSnackbar('Failed to delete QR code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = (shortCode) => {
    const canvas = document.getElementById(`qr-${shortCode}`);
    if (canvas) {
      canvas.toBlob((blob) => {
        saveAs(blob, `qrcode-${shortCode}.png`);
      });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSnackbar('Copied to clipboard', 'success');
  };

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'url',
      isActive: true,
      destinations: [{
        id: uuidv4(),
        url: '',
        os: '',
        isDefault: true
      }]
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
                margin="normal"
                required
              />
              
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={2}
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  label="Type"
                  required
                >
                  <MenuItem value="url">URL</MenuItem>
                  <MenuItem value="app_store">App Store</MenuItem>
                  <MenuItem value="dynamic_redirect">Dynamic Redirect</MenuItem>
                </Select>
              </FormControl>
              
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
                sx={{ mt: 2, display: 'block' }}
              />
              
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                Destinations
              </Typography>
              
              {formData.destinations.map((destination, index) => (
                <Box key={destination.id} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={7}>
                      <TextField
                        fullWidth
                        label="URL"
                        value={destination.url}
                        onChange={(e) => handleDestinationChange(index, 'url', e.target.value)}
                        margin="normal"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                      <FormControl fullWidth margin="normal">
                        <InputLabel>OS (Optional)</InputLabel>
                        <Select
                          value={destination.os || ''}
                          onChange={(e) => handleDestinationChange(index, 'os', e.target.value)}
                          label="OS (Optional)"
                        >
                          <MenuItem value="">Any OS</MenuItem>
                          <MenuItem value="ios">iOS</MenuItem>
                          <MenuItem value="android">Android</MenuItem>
                          <MenuItem value="windows">Windows</MenuItem>
                          <MenuItem value="macos">macOS</MenuItem>
                          <MenuItem value="linux">Linux</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={destination.isDefault || false}
                            onChange={(e) => handleDestinationChange(index, 'isDefault', e.target.checked)}
                            color="primary"
                          />
                        }
                        label="Default"
                        labelPlacement="top"
                        sx={{ m: 0 }}
                      />
                      <IconButton 
                        onClick={() => removeDestination(index)}
                        color="error"
                        disabled={formData.destinations.length <= 1}
                        sx={{ ml: 'auto' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              ))}
              
              <Button 
                variant="outlined" 
                onClick={addDestination}
                startIcon={<AddIcon />}
                sx={{ mt: 1 }}
              >
                Add Destination
              </Button>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
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
              <Box textAlign="center" py={4}>
                <Typography variant="body1" color="textSecondary" gutterBottom>
                  No QR codes found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Create your first QR code using the form on the left
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {qrCodes.map((qrCode) => (
                  <Grid item xs={12} key={qrCode.id}>
                    <Card>
                      <CardContent>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={3}>
                            <QRCodeSVG
                              value={qrCode.destinations?.[0]?.url || 'https://example.com'}
                              size={80}
                              level="H"
                              includeMargin={true}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="subtitle1" noWrap>
                              {qrCode.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" noWrap>
                              {qrCode.destinations?.[0]?.url || 'No URL'}
                            </Typography>
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
                              onClick={() => handleEdit(qrCode)}
                              title="Edit"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton 
                              size="small"
                              onClick={() => downloadQRCode(qrCode.short_code)}
                              title="Download"
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
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
