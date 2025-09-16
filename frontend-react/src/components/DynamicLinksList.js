import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  IconButton, 
  Box,
  Button
} from '@mui/material';
import { Edit, Delete, QrCode as QrCodeIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  timeout: 10000,
});

const DynamicLinksList = () => {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const response = await api.get('/dynamic-links/');
      // Ensure we have an array and add id field if it's missing
      const linksWithIds = Array.isArray(response.data) 
        ? response.data.map(link => ({
            ...link,
            id: link.id || link._id // Handle both id and _id formats
          }))
        : [];
      setLinks(linksWithIds);
    } catch (error) {
      console.error('Error fetching links:', error);
      alert('Failed to load dynamic links');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this link?')) {
      try {
        const response = await api.delete(`/dynamic-links/${id}`);
        if (response.status === 204) {
          // Refresh the links list after successful deletion
          fetchLinks();
        }
      } catch (error) {
        console.error('Error deleting link:', error);
        alert(error.response?.data?.detail || 'Failed to delete link');
      }
    }
  };

  const handleGenerateQR = (shortCode) => {
    const baseUrl = process.env.REACT_APP_PUBLIC_URL || window.location.origin;
    const link = `${baseUrl}/d/${shortCode}`;
    navigator.clipboard.writeText(link);
    // You can show a snackbar here if needed
    alert('Dynamic link copied to clipboard!');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Dynamic Links</Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate('/dynamic-links/new')}
        >
          Create New Link
        </Button>
      </Box>

      <Grid container spacing={3}>
        {links.length === 0 ? (
          <Grid item xs={12}>
            <Typography>No dynamic links found. Create your first one.</Typography>
          </Grid>
        ) : (
          links.map((link) => (
            <Grid item xs={12} key={link.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6">{link.name}</Typography>
                  {link.android_url && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="textSecondary">Android</Typography>
                      <Typography variant="body2" noWrap>{link.android_url}</Typography>
                    </Box>
                  )}
                  {link.ios_url && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="textSecondary">iOS</Typography>
                      <Typography variant="body2" noWrap>{link.ios_url}</Typography>
                    </Box>
                  )}
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="textSecondary">
                      Clicks: {link.total_clicks || 0}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Created: {new Date(link.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end' }}>
                  <IconButton 
                    onClick={() => handleGenerateQR(link.short_code)}
                    title="Generate QR Code"
                  >
                    <QrCodeIcon />
                  </IconButton>
                  <IconButton 
                    onClick={() => navigate(`/dynamic-links/${link.id}`)}
                    title="Edit"
                  >
                    <Edit />
                  </IconButton>
                  <IconButton 
                    onClick={() => handleDelete(link.id)}
                    title="Delete"
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
    </Container>
  );
};

export default DynamicLinksList;
