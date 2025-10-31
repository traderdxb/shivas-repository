import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all removals
router.get('/', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {
      ...(startDate && endDate && {
        removalDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const removals = await prisma.removal.findMany({
      where,
      include: {
        vehicle: true,
        user: { select: { id: true, name: true } }
      },
      orderBy: { removalDate: 'desc' }
    });

    res.json(removals);
  } catch (error) {
    console.error('Fetch removals error:', error);
    res.status(500).json({ error: 'Failed to fetch removals' });
  }
});

// Create removal
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { vehicleId, deviceId, simId, reason, remarks } = req.body;

    if (!vehicleId || !reason) {
      return res.status(400).json({ error: 'Vehicle and reason are required' });
    }

    // Create removal record
    const removal = await prisma.removal.create({
      data: {
        vehicleId,
        deviceId,
        simId,
        reason,
        remarks,
        removedBy: req.user.id
      },
      include: {
        vehicle: true
      }
    });

    // Update device status if device was removed
    if (deviceId) {
      const device = await prisma.device.findUnique({ where: { id: deviceId } });
      if (device) {
        if (device.ownership === 'LEASING') {
          await prisma.device.update({
            where: { id: deviceId },
            data: { status: 'AVAILABLE' }
          });
        } else {
          await prisma.device.update({
            where: { id: deviceId },
            data: { status: 'AVAILABLE_FOR_TRANSFER' }
          });
        }
      }
    }

    // Update SIM status if SIM was removed
    if (simId) {
      const sim = await prisma.sIM.findUnique({ where: { id: simId } });
      if (sim && sim.ownership === 'LEASING') {
        await prisma.sIM.update({
          where: { id: simId },
          data: { status: 'AVAILABLE' }
        });
      }
    }

    // Deactivate related assignment
    await prisma.vehicleAssignment.updateMany({
      where: {
        vehicleId,
        active: true,
        ...(deviceId && { deviceId })
      },
      data: { active: false }
    });

    await logActivity(req.user.id, 'CREATE_REMOVAL', 'REMOVALS', { removalId: removal.id });

    res.status(201).json(removal);
  } catch (error) {
    console.error('Create removal error:', error);
    res.status(500).json({ error: 'Failed to create removal' });
  }
});

export default router;
