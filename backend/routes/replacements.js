import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all replacements
router.get('/', authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {
      ...(startDate && endDate && {
        replacementDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const replacements = await prisma.replacement.findMany({
      where,
      include: {
        assignment: {
          include: {
            vehicle: true,
            client: true
          }
        },
        oldDevice: true,
        newDevice: true,
        user: { select: { id: true, name: true } }
      },
      orderBy: { replacementDate: 'desc' }
    });

    res.json(replacements);
  } catch (error) {
    console.error('Fetch replacements error:', error);
    res.status(500).json({ error: 'Failed to fetch replacements' });
  }
});

// Create replacement
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { assignmentId, oldDeviceId, newDeviceId, reason, remarks } = req.body;

    if (!assignmentId || !oldDeviceId || !newDeviceId || !reason) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Get old device info
    const oldDevice = await prisma.device.findUnique({ where: { id: oldDeviceId } });
    if (!oldDevice) {
      return res.status(404).json({ error: 'Old device not found' });
    }

    // Check new device availability
    const newDevice = await prisma.device.findUnique({ where: { id: newDeviceId } });
    if (!newDevice || newDevice.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'New device not available' });
    }

    // Create replacement record
    const replacement = await prisma.replacement.create({
      data: {
        assignmentId,
        oldDeviceId,
        newDeviceId,
        reason,
        remarks,
        replacedBy: req.user.id
      },
      include: {
        oldDevice: true,
        newDevice: true,
        assignment: {
          include: {
            vehicle: true,
            client: true
          }
        }
      }
    });

    // Update assignment with new device
    await prisma.vehicleAssignment.update({
      where: { id: assignmentId },
      data: { deviceId: newDeviceId }
    });

    // Update old device status based on ownership
    if (oldDevice.ownership === 'LEASING') {
      await prisma.device.update({
        where: { id: oldDeviceId },
        data: { status: 'AVAILABLE' }
      });
    } else {
      await prisma.device.update({
        where: { id: oldDeviceId },
        data: { status: 'AVAILABLE_FOR_TRANSFER' }
      });
    }

    // Update new device status
    await prisma.device.update({
      where: { id: newDeviceId },
      data: { status: 'ASSIGNED' }
    });

    await logActivity(req.user.id, 'CREATE_REPLACEMENT', 'REPLACEMENTS', { replacementId: replacement.id });

    res.status(201).json(replacement);
  } catch (error) {
    console.error('Create replacement error:', error);
    res.status(500).json({ error: 'Failed to create replacement' });
  }
});

export default router;
