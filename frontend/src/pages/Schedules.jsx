import { Box, Typography, Paper } from '@mui/material';

export default function Schedules() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Job Scheduling
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          Schedule jobs for technicians with calendar view and WhatsApp notifications.
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
          Features include:
        </Typography>
        <Typography component="ul">
          <li>Calendar and time-based job assignment</li>
          <li>WhatsApp integration for notifications</li>
          <li>Job tracking and accountability</li>
        </Typography>
      </Paper>
    </Box>
  );
}
