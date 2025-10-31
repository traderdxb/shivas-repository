import { Box, Typography, Paper } from '@mui/material';

export default function Settings() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          System Configuration
        </Typography>
        <Typography variant="body2" paragraph>
          Configure system settings, manage static data lists, and update application preferences.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Available settings include:
        </Typography>
        <Typography component="ul">
          <li>Device models and types</li>
          <li>SIM brands</li>
          <li>Locations</li>
          <li>Installers</li>
          <li>Platforms</li>
          <li>Accessories</li>
        </Typography>
      </Paper>
    </Box>
  );
}
