import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all assignments with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { platform, clientId, location, ownership, active, jobType, startDate, endDate } = req.query;

    const where = {
      ...(active !== undefined && { active: active === 'true' }),
      ...(platform && { platform }),
      ...(clientId && { clientId }),
      ...(location && { location }),
      ...(jobType && { jobType }),
      ...(startDate && endDate && {
        activationDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const assignments = await prisma.vehicleAssignment.findMany({
      where,
      include: {
        device: true,
        sim: true,
        vehicle: true,
        client: true,
        addedByUser: { select: { id: true, name: true } },
        installer: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Filter by ownership if provided
    let filtered = assignments;
    if (ownership) {
      filtered = assignments.filter(a => a.device.ownership === ownership);
    }

    res.json(filtered);
  } catch (error) {
    console.error('Fetch assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Get assignment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const assignment = await prisma.vehicleAssignment.findUnique({
      where: { id: req.params.id },
      include: {
        device: true,
        sim: true,
        vehicle: true,
        client: true,
        addedByUser: { select: { id: true, name: true, email: true } },
        installer: { select: { id: true, name: true, email: true } },
        replacements: true,
        renewals: true
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Fetch assignment error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});

// Create assignment
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const {
      jobType,
      deviceId,
      simId,
      vehicleId,
      clientId,
      platform,
      installationDate,
      activationDate,
      certificateExpiry,
      subscriptionExpiry,
      month,
      location,
      accessories,
      remarks,
      installedBy
    } = req.body;

    // Validation
    if (!jobType || !deviceId || !vehicleId || !clientId || !platform) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    // Check device availability
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device || (device.status !== 'AVAILABLE' && device.status !== 'AVAILABLE_FOR_TRANSFER')) {
      return res.status(400).json({ error: 'Device not available' });
    }

    // Check SIM availability if provided
    if (simId) {
      const sim = await prisma.sIM.findUnique({ where: { id: simId } });
      if (!sim || sim.status !== 'AVAILABLE') {
        return res.status(400).json({ error: 'SIM not available' });
      }
    }

    // Create assignment
    const assignment = await prisma.vehicleAssignment.create({
      data: {
        jobType,
        deviceId,
        simId,
        vehicleId,
        clientId,
        platform,
        installationDate: installationDate ? new Date(installationDate) : new Date(),
        activationDate: new Date(activationDate),
        certificateExpiry: new Date(certificateExpiry),
        subscriptionExpiry: new Date(subscriptionExpiry),
        month,
        location,
        accessories,
        remarks,
        addedBy: req.user.id,
        installedBy,
        active: true
      },
      include: {
        device: true,
        sim: true,
        vehicle: true,
        client: true
      }
    });

    // Update device status
    await prisma.device.update({
      where: { id: deviceId },
      data: { status: 'ASSIGNED' }
    });

    // Update SIM status if provided
    if (simId) {
      await prisma.sIM.update({
        where: { id: simId },
        data: { status: 'ASSIGNED' }
      });
    }

    // Create renewal records
    await prisma.renewal.createMany({
      data: [
        {
          assignmentId: assignment.id,
          clientId,
          renewalType: 'CERTIFICATE',
          originalExpiry: new Date(certificateExpiry),
          status: 'UPCOMING'
        },
        {
          assignmentId: assignment.id,
          clientId,
          renewalType: 'SUBSCRIPTION',
          originalExpiry: new Date(subscriptionExpiry),
          status: 'UPCOMING'
        }
      ]
    });

    await logActivity(req.user.id, 'CREATE_ASSIGNMENT', 'ASSIGNMENTS', { assignmentId: assignment.id });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create assignment error:', error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

// Update assignment
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove immutable fields
    delete updates.id;
    delete updates.createdAt;
    delete updates.addedBy;

    // Convert date strings to Date objects
    if (updates.installationDate) updates.installationDate = new Date(updates.installationDate);
    if (updates.activationDate) updates.activationDate = new Date(updates.activationDate);
    if (updates.certificateExpiry) updates.certificateExpiry = new Date(updates.certificateExpiry);
    if (updates.subscriptionExpiry) updates.subscriptionExpiry = new Date(updates.subscriptionExpiry);

    const assignment = await prisma.vehicleAssignment.update({
      where: { id },
      data: updates,
      include: {
        device: true,
        sim: true,
        vehicle: true,
        client: true
      }
    });

    await logActivity(req.user.id, 'UPDATE_ASSIGNMENT', 'ASSIGNMENTS', { assignmentId: id });

    res.json(assignment);
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

// Deactivate assignment
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { id } = req.params;

    const assignment = await prisma.vehicleAssignment.update({
      where: { id },
      data: { active: false },
      include: { device: true, sim: true }
    });

    // Update device status based on ownership
    if (assignment.device.ownership === 'LEASING') {
      await prisma.device.update({
        where: { id: assignment.deviceId },
        data: { status: 'AVAILABLE' }
      });
    } else {
      await prisma.device.update({
        where: { id: assignment.deviceId },
        data: { status: 'AVAILABLE_FOR_TRANSFER' }
      });
    }

    // Update SIM status
    if (assignment.simId && assignment.sim) {
      if (assignment.sim.ownership === 'LEASING') {
        await prisma.sIM.update({
          where: { id: assignment.simId },
          data: { status: 'AVAILABLE' }
        });
      }
    }

    await logActivity(req.user.id, 'DEACTIVATE_ASSIGNMENT', 'ASSIGNMENTS', { assignmentId: id });

    res.json({ message: 'Assignment deactivated successfully' });
  } catch (error) {
    console.error('Deactivate assignment error:', error);
    res.status(500).json({ error: 'Failed to deactivate assignment' });
  }
});

// Get platform masterlist
router.get('/platform/masterlist', authenticate, async (req, res) => {
  try {
    const { platform } = req.query;

    const where = {
      active: true,
      ...(platform && { platform })
    };

    const assignments = await prisma.vehicleAssignment.findMany({
      where,
      include: {
        device: true,
        sim: true,
        vehicle: true,
        client: true
      },
      orderBy: [{ platform: 'asc' }, { client: { name: 'asc' } }]
    });

    res.json(assignments);
  } catch (error) {
    console.error('Fetch masterlist error:', error);
    res.status(500).json({ error: 'Failed to fetch masterlist' });
  }
});

export default router;
