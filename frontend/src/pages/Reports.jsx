import { Box, Typography, Grid, Paper, Button } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

export default function Reports() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Activity Summary Report
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Daily activity summary covering installations, transfers, removals, replacements, and renewals.
            </Typography>
            <Button variant="contained" startIcon={<DownloadIcon />}>
              Generate Report
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Platform Masterlist
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Export active tracker lists by platform with detailed information.
            </Typography>
            <Button variant="contained" startIcon={<DownloadIcon />}>
              Export Masterlist
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Inventory Export
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Export complete device and SIM inventory data to Excel.
            </Typography>
            <Button variant="contained" startIcon={<DownloadIcon />} sx={{ mr: 1 }}>
              Export Devices
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />}>
              Export SIMs
            </Button>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              ITC Certificates
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Generate installation certificates for new installations and renewals.
            </Typography>
            <Button variant="contained">
              Generate Certificate
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
