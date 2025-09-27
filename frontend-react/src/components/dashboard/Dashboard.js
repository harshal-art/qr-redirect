import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Typography, 
  Grid, 
  Paper,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { 
  Add as AddIcon,
  Search as SearchIcon,
  ContentCopy as CopyIcon,
  QrCode as QrCodeIcon,
  Edit as EditIcon,
  BarChart as AnalyticsIcon,
  Delete as DeleteIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { useAuth } from '../auth/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [qrCodes, setQrCodes] = useState([
    {
      id: '1',
      name: 'Business Card',
      shortUrl: 'qret.xyz/abc123',
      destination: 'https://example.com/vcard',
      type: 'vcard',
      scans: 42,
      lastScan: '2023-05-15T10:30:00Z',
      createdAt: '2023-01-15T08:00:00Z',
      status: 'active'
    },
    {
      id: '2',
      name: 'Product Page',
      shortUrl: 'qret.xyz/def456',
      destination: 'https://example.com/products/123',
      type: 'url',
      scans: 128,
      lastScan: '2023-05-18T14:22:00Z',
      createdAt: '2023-02-20T11:15:00Z',
      status: 'active'
    },
    {
      id: '3',
      name: 'Event Registration',
      shortUrl: 'qret.xyz/ghi789',
      destination: 'https://example.com/events/summer-sale',
      type: 'event',
      scans: 0,
      lastScan: null,
      createdAt: '2023-05-01T09:45:00Z',
      status: 'inactive'
    },
  ]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredQRCodes = qrCodes.filter(qr => 
    (qr.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     qr.destination.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (tabValue === 0 || 
     (tabValue === 1 && qr.status === 'active') || 
     (tabValue === 2 && qr.status === 'inactive'))
  );

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Show success message
  };

  const getTypeLabel = (type) => {
    const types = {
      'url': 'URL',
      'vcard': 'vCard',
      'event': 'Event',
      'wifi': 'WiFi',
      'sms': 'SMS',
      'email': 'Email'
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          My QR Codes
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/dynamic-links/new')}
        >
          Create New
        </Button>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All" />
          <Tab label="Active" />
          <Tab label="Inactive" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search QR codes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>QR Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Short URL</TableCell>
              <TableCell>Destination</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Scans</TableCell>
              <TableCell>Last Scan</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredQRCodes
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((qr) => (
                <TableRow key={qr.id} hover>
                  <TableCell>
                    <Box sx={{ width: 40, height: 40 }}>
                      <QRCodeSVG
                        value={qr.shortUrl}
                        size={40}
                        level="H"
                        includeMargin={false}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>{qr.name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinkIcon color="action" fontSize="small" />
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {qr.shortUrl}
                      </Typography>
                      <Tooltip title="Copy">
                        <IconButton size="small" onClick={() => copyToClipboard(qr.shortUrl)}>
                          <CopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={qr.destination}>
                      <Typography noWrap sx={{ maxWidth: 200 }}>
                        {qr.destination}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getTypeLabel(qr.type)} 
                      size="small" 
                      color="default"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{qr.scans.toLocaleString()}</TableCell>
                  <TableCell>{formatDate(qr.lastScan)}</TableCell>
                  <TableCell>{new Date(qr.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip 
                      label={qr.status === 'active' ? 'Active' : 'Inactive'} 
                      color={qr.status === 'active' ? 'success' : 'default'} 
                      size="small"
                      variant={qr.status === 'active' ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Analytics">
                        <IconButton size="small" onClick={() => navigate(`/analytics/${qr.id}`)}>
                          <AnalyticsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => navigate(`/dynamic-links/${qr.id}`)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredQRCodes.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {filteredQRCodes.length === 0 && (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          p: 4,
          textAlign: 'center'
        }}>
          <QrCodeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No QR codes found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 500 }}>
            {searchTerm 
              ? 'No QR codes match your search. Try different keywords.'
              : tabValue === 0 
                ? 'You haven\'t created any QR codes yet.'
                : tabValue === 1
                  ? 'You don\'t have any active QR codes.'
                  : 'You don\'t have any inactive QR codes.'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/dynamic-links/new')}
          >
            Create Your First QR Code
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;
