import { Box, Typography } from '@mui/material';

export default function Tasks() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Pending Tasks
      </Typography>
      <Typography>
        Track all pending tasks including installations, transfers, removals, rechecks, renewals, and support tasks.
      </Typography>
    </Box>
  );
}
