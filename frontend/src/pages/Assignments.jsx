import { Box, Typography, Paper } from '@mui/material';

export default function Assignments() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Vehicle Assignments
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Assignment Types:
        </Typography>
        <Typography component="ul">
          <li>New Installation</li>
          <li>Device Replacement</li>
          <li>Transfer Installation</li>
          <li>Removal</li>
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          This module handles all vehicle assignment operations with automatic inventory management
          and platform tracking.
        </Typography>
      </Paper>
    </Box>
  );
}
