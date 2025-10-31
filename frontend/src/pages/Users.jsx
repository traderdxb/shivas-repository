import { Box, Typography, Paper } from '@mui/material';

export default function Users() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          User Roles:
        </Typography>
        <Typography component="ul">
          <li>Admin - Full system access</li>
          <li>Manager - Management and oversight</li>
          <li>Accounts - Financial and renewal access</li>
          <li>Support - Technical operations</li>
          <li>Sales - Client management</li>
          <li>Viewer - Read-only access</li>
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Manage employee login credentials and role-based permissions.
        </Typography>
      </Paper>
    </Box>
  );
}
