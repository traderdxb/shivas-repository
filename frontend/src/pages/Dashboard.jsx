import { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
} from '@mui/material';
import {
  Devices as DevicesIcon,
  SimCard as SimCardIcon,
  Assignment as AssignmentIcon,
  Task as TaskIcon,
} from '@mui/icons-material';
import { analyticsAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await analyticsAPI.getDashboard();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const summaryCards = [
    {
      title: 'Active Assignments',
      value: analytics?.summary?.activeAssignments || 0,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
    },
    {
      title: 'Available Devices',
      value: analytics?.summary?.availableDevices || 0,
      icon: <DevicesIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
    },
    {
      title: 'Available SIMs',
      value: analytics?.summary?.availableSims || 0,
      icon: <SimCardIcon sx={{ fontSize: 40 }} />,
      color: '#ed6c02',
    },
    {
      title: 'Pending Tasks',
      value: analytics?.summary?.pendingTasks || 0,
      icon: <TaskIcon sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {summaryCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4">{card.value}</Typography>
                  </Box>
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* Top Clients Chart */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Top Clients by Installations
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.topClients?.slice(0, 5) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="clientName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#1976d2" name="Installations" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Technician Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Technician Performance
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.technicianStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="technicianName" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#2e7d32" name="Installations" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Installation Locations */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Installations by Location
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics?.locationStats || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.location}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(analytics?.locationStats || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Renewal Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Renewal Status
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics?.renewalStats || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#ed6c02" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
