import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get dashboard analytics
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = startDate && endDate ? {
      gte: new Date(startDate),
      lte: new Date(endDate)
    } : undefined;

    // Installations by month
    const installations = await prisma.vehicleAssignment.groupBy({
      by: ['month'],
      _count: { id: true },
      where: {
        ...(dateFilter && { installationDate: dateFilter })
      },
      orderBy: { month: 'asc' }
    });

    // Removals by month
    const removals = await prisma.removal.groupBy({
      by: ['removalDate'],
      _count: { id: true },
      where: {
        ...(dateFilter && { removalDate: dateFilter })
      }
    });

    // Top clients by installations
    const topClients = await prisma.vehicleAssignment.groupBy({
      by: ['clientId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });

    const topClientsWithNames = await Promise.all(
      topClients.map(async (item) => {
        const client = await prisma.client.findUnique({
          where: { id: item.clientId },
          select: { name: true }
        });
        return {
          clientName: client?.name || 'Unknown',
          count: item._count.id
        };
      })
    );

    // Installations by technician
    const technicianStats = await prisma.vehicleAssignment.groupBy({
      by: ['installedBy'],
      _count: { id: true },
      where: {
        installedBy: { not: null },
        ...(dateFilter && { installationDate: dateFilter })
      },
      orderBy: { _count: { id: 'desc' } }
    });

    const technicianStatsWithNames = await Promise.all(
      technicianStats.map(async (item) => {
        const user = await prisma.user.findUnique({
          where: { id: item.installedBy },
          select: { name: true }
        });
        return {
          technicianName: user?.name || 'Unknown',
          count: item._count.id
        };
      })
    );

    // Installations by location
    const locationStats = await prisma.vehicleAssignment.groupBy({
      by: ['location'],
      _count: { id: true },
      where: {
        ...(dateFilter && { installationDate: dateFilter })
      },
      orderBy: { _count: { id: 'desc' } }
    });

    // Device ownership distribution
    const deviceOwnership = await prisma.device.groupBy({
      by: ['ownership', 'status'],
      _count: { id: true }
    });

    // Renewal statistics
    const renewalStats = await prisma.renewal.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    // Active assignments count
    const activeAssignments = await prisma.vehicleAssignment.count({
      where: { active: true }
    });

    // Available devices
    const availableDevices = await prisma.device.count({
      where: { status: 'AVAILABLE' }
    });

    // Available SIMs
    const availableSims = await prisma.sIM.count({
      where: { status: 'AVAILABLE' }
    });

    // Pending tasks
    const pendingTasks = await prisma.pendingTask.count({
      where: { status: 'PENDING' }
    });

    res.json({
      installations: installations.map(i => ({ month: i.month, count: i._count.id })),
      removals: removals.length,
      topClients: topClientsWithNames,
      technicianStats: technicianStatsWithNames,
      locationStats: locationStats.map(l => ({ location: l.location, count: l._count.id })),
      deviceOwnership: deviceOwnership.map(d => ({ ownership: d.ownership, status: d.status, count: d._count.id })),
      renewalStats: renewalStats.map(r => ({ status: r.status, count: r._count.id })),
      summary: {
        activeAssignments,
        availableDevices,
        availableSims,
        pendingTasks
      }
    });
  } catch (error) {
    console.error('Fetch analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get monthly statistics
router.get('/monthly', authenticate, async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

    const installations = await prisma.vehicleAssignment.count({
      where: {
        installationDate: { gte: startDate, lte: endDate }
      }
    });

    const removals = await prisma.removal.count({
      where: {
        removalDate: { gte: startDate, lte: endDate }
      }
    });

    const replacements = await prisma.replacement.count({
      where: {
        replacementDate: { gte: startDate, lte: endDate }
      }
    });

    res.json({
      year: parseInt(year),
      month: parseInt(month),
      installations,
      removals,
      replacements
    });
  } catch (error) {
    console.error('Fetch monthly statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch monthly statistics' });
  }
});

export default router;
