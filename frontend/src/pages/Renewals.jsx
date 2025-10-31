import { Box, Typography, Paper } from '@mui/material';

export default function Renewals() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Subscription Renewals
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Track and manage:
        </Typography>
        <Typography component="ul">
          <li>Platform subscription renewals</li>
          <li>Certificate expiries</li>
          <li>SIM subscription expiries</li>
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Automatic status updates: Upcoming (30 days), Due (today), Overdue (past due), Renewed
        </Typography>
      </Paper>
    </Box>
  );
}
