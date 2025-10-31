import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all devices with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, ownership, model, search } = req.query;

    const where = {
      ...(status && { status }),
      ...(ownership && { ownership }),
      ...(model && { model }),
      ...(search && {
        OR: [
          { imei: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const devices = await prisma.device.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(devices);
  } catch (error) {
    console.error('Fetch devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

// Get device by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const device = await prisma.device.findUnique({
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

    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    res.json(device);
  } catch (error) {
    console.error('Fetch device error:', error);
    res.status(500).json({ error: 'Failed to fetch device' });
  }
});

// Create device
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { model, imei, serialNumber, ownership } = req.body;

    if (!model || !imei || !ownership) {
      return res.status(400).json({ error: 'Model, IMEI, and ownership are required' });
    }

    const existingDevice = await prisma.device.findUnique({ where: { imei } });
    if (existingDevice) {
      return res.status(400).json({ error: 'Device with this IMEI already exists' });
    }

    const device = await prisma.device.create({
      data: {
        model,
        imei,
        serialNumber,
        ownership,
        status: 'AVAILABLE'
      }
    });

    await logActivity(req.user.id, 'CREATE_DEVICE', 'DEVICES', { deviceId: device.id, imei });

    res.status(201).json(device);
  } catch (error) {
    console.error('Create device error:', error);
    res.status(500).json({ error: 'Failed to create device' });
  }
});

// Update device
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { model, serialNumber, ownership, status } = req.body;

    const device = await prisma.device.update({
      where: { id },
      data: {
        ...(model && { model }),
        ...(serialNumber && { serialNumber }),
        ...(ownership && { ownership }),
        ...(status && { status })
      }
    });

    await logActivity(req.user.id, 'UPDATE_DEVICE', 'DEVICES', { deviceId: id });

    res.json(device);
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ error: 'Failed to update device' });
  }
});

// Delete device
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if device is assigned
    const assignments = await prisma.vehicleAssignment.findMany({
      where: { deviceId: id, active: true }
    });

    if (assignments.length > 0) {
      return res.status(400).json({ error: 'Cannot delete assigned device' });
    }

    await prisma.device.delete({ where: { id } });

    await logActivity(req.user.id, 'DELETE_DEVICE', 'DEVICES', { deviceId: id });

    res.json({ message: 'Device deleted successfully' });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Failed to delete device' });
  }
});

// Get available devices for assignment
router.get('/available/list', authenticate, async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: {
        OR: [
          { status: 'AVAILABLE' },
          { status: 'AVAILABLE_FOR_TRANSFER' }
        ]
      },
      orderBy: { model: 'asc' }
    });

    res.json(devices);
  } catch (error) {
    console.error('Fetch available devices error:', error);
    res.status(500).json({ error: 'Failed to fetch available devices' });
  }
});

export default router;
