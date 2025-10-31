import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all SIMs with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, ownership, brand, search } = req.query;

    const where = {
      ...(status && { status }),
      ...(ownership && { ownership }),
      ...(brand && { brand }),
      ...(search && {
        OR: [
          { simNumber: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const sims = await prisma.sIM.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(sims);
  } catch (error) {
    console.error('Fetch SIMs error:', error);
    res.status(500).json({ error: 'Failed to fetch SIMs' });
  }
});

// Get SIM by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const sim = await prisma.sIM.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: {
          include: {
            vehicle: true,
            client: true
          }
        }
      }
    });

    if (!sim) {
      return res.status(404).json({ error: 'SIM not found' });
    }

    res.json(sim);
  } catch (error) {
    console.error('Fetch SIM error:', error);
    res.status(500).json({ error: 'Failed to fetch SIM' });
  }
});

// Create SIM
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { brand, simNumber, serialNumber, ownership } = req.body;

    if (!brand || !simNumber || !ownership) {
      return res.status(400).json({ error: 'Brand, SIM number, and ownership are required' });
    }

    const existingSim = await prisma.sIM.findUnique({ where: { simNumber } });
    if (existingSim) {
      return res.status(400).json({ error: 'SIM with this number already exists' });
    }

    const sim = await prisma.sIM.create({
      data: {
        brand,
        simNumber,
        serialNumber,
        ownership,
        status: 'AVAILABLE'
      }
    });

    await logActivity(req.user.id, 'CREATE_SIM', 'SIMS', { simId: sim.id, simNumber });

    res.status(201).json(sim);
  } catch (error) {
    console.error('Create SIM error:', error);
    res.status(500).json({ error: 'Failed to create SIM' });
  }
});

// Update SIM
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, serialNumber, ownership, status } = req.body;

    const sim = await prisma.sIM.update({
      where: { id },
      data: {
        ...(brand && { brand }),
        ...(serialNumber && { serialNumber }),
        ...(ownership && { ownership }),
        ...(status && { status })
      }
    });

    await logActivity(req.user.id, 'UPDATE_SIM', 'SIMS', { simId: id });

    res.json(sim);
  } catch (error) {
    console.error('Update SIM error:', error);
    res.status(500).json({ error: 'Failed to update SIM' });
  }
});

// Delete SIM
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if SIM is assigned
    const assignments = await prisma.vehicleAssignment.findMany({
      where: { simId: id, active: true }
    });

    if (assignments.length > 0) {
      return res.status(400).json({ error: 'Cannot delete assigned SIM' });
    }

    await prisma.sIM.delete({ where: { id } });

    await logActivity(req.user.id, 'DELETE_SIM', 'SIMS', { simId: id });

    res.json({ message: 'SIM deleted successfully' });
  } catch (error) {
    console.error('Delete SIM error:', error);
    res.status(500).json({ error: 'Failed to delete SIM' });
  }
});

// Get available SIMs for assignment
router.get('/available/list', authenticate, async (req, res) => {
  try {
    const sims = await prisma.sIM.findMany({
      where: { status: 'AVAILABLE' },
      orderBy: { brand: 'asc' }
    });

    res.json(sims);
  } catch (error) {
    console.error('Fetch available SIMs error:', error);
    res.status(500).json({ error: 'Failed to fetch available SIMs' });
  }
});

export default router;
