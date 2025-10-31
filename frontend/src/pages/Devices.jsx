import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Upload as UploadIcon } from '@mui/icons-material';
import { deviceAPI, uploadAPI, staticDataAPI } from '../services/api';

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [deviceModels, setDeviceModels] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [currentDevice, setCurrentDevice] = useState(null);
  const [formData, setFormData] = useState({
    model: '',
    imei: '',
    serialNumber: '',
    ownership: 'OWNED',
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchDevices();
    fetchDeviceModels();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await deviceAPI.getAll();
      setDevices(response.data);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to fetch devices' });
    }
  };

  const fetchDeviceModels = async () => {
    try {
      const response = await staticDataAPI.getByCategory('device_model');
      setDeviceModels(response.data);
    } catch (error) {
      console.error('Failed to fetch device models');
    }
  };

  const handleOpenDialog = (device = null) => {
    if (device) {
      setCurrentDevice(device);
      setFormData({
        model: device.model,
        imei: device.imei,
        serialNumber: device.serialNumber || '',
        ownership: device.ownership,
      });
    } else {
      setCurrentDevice(null);
      setFormData({
        model: '',
        imei: '',
        serialNumber: '',
        ownership: 'OWNED',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentDevice(null);
  };

  const handleSubmit = async () => {
    try {
      if (currentDevice) {
        await deviceAPI.update(currentDevice.id, formData);
        setMessage({ type: 'success', text: 'Device updated successfully' });
      } else {
        await deviceAPI.create(formData);
        setMessage({ type: 'success', text: 'Device created successfully' });
      }
      fetchDevices();
      handleCloseDialog();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Operation failed' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await deviceAPI.delete(id);
        setMessage({ type: 'success', text: 'Device deleted successfully' });
        fetchDevices();
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.error || 'Delete failed' });
      }
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;

    try {
      const response = await uploadAPI.devices(uploadFile);
      setMessage({
        type: 'success',
        text: `Upload completed: ${response.data.results.success} successful, ${response.data.results.failed} failed`,
      });
      fetchDevices();
      setOpenUploadDialog(false);
      setUploadFile(null);
    } catch (error) {
      setMessage({ type: 'error', text: 'Upload failed' });
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await uploadAPI.getTemplate('devices');
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'device_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to download template' });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      AVAILABLE: 'success',
      ASSIGNED: 'primary',
      REMOVED: 'error',
      AVAILABLE_FOR_TRANSFER: 'warning',
      FAULTY: 'error',
    };
    return colors[status] || 'default';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Devices</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setOpenUploadDialog(true)}
            sx={{ mr: 1 }}
          >
            Bulk Upload
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            Add Device
          </Button>
        </Box>
      </Box>

      {message.text && (
        <Alert severity={message.type} onClose={() => setMessage({ type: '', text: '' })} sx={{ mb: 2 }}>
          {message.text}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Model</TableCell>
              <TableCell>IMEI</TableCell>
              <TableCell>Serial Number</TableCell>
              <TableCell>Ownership</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell>{device.model}</TableCell>
                <TableCell>{device.imei}</TableCell>
                <TableCell>{device.serialNumber || 'N/A'}</TableCell>
                <TableCell>{device.ownership}</TableCell>
                <TableCell>
                  <Chip label={device.status} color={getStatusColor(device.status)} size="small" />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpenDialog(device)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(device.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{currentDevice ? 'Edit Device' : 'Add Device'}</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            margin="normal"
            label="Model"
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
          >
            {deviceModels.map((model) => (
              <MenuItem key={model.id} value={model.value}>
                {model.value}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            margin="normal"
            label="IMEI"
            value={formData.imei}
            onChange={(e) => setFormData({ ...formData, imei: e.target.value })}
            disabled={!!currentDevice}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Serial Number"
            value={formData.serialNumber}
            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
          />
          <TextField
            select
            fullWidth
            margin="normal"
            label="Ownership"
            value={formData.ownership}
            onChange={(e) => setFormData({ ...formData, ownership: e.target.value })}
          >
            <MenuItem value="OWNED">Owned</MenuItem>
            <MenuItem value="LEASING">Leasing</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {currentDevice ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={openUploadDialog} onClose={() => setOpenUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Bulk Upload Devices</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <Button variant="outlined" onClick={downloadTemplate} fullWidth sx={{ mb: 2 }}>
              Download Excel Template
            </Button>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setUploadFile(e.target.files[0])}
              style={{ width: '100%' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUploadDialog(false)}>Cancel</Button>
          <Button onClick={handleFileUpload} variant="contained" disabled={!uploadFile}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
