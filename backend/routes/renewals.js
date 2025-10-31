import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all renewals with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, clientId, renewalType, platform } = req.query;

    // Build where clause
    const where = {
      ...(status && { status }),
      ...(clientId && { clientId }),
      ...(renewalType && { renewalType })
    };

    const renewals = await prisma.renewal.findMany({
      where,
      include: {
        assignment: {
          include: {
            vehicle: true,
            device: true,
            client: true
          }
        },
        client: true
      },
      orderBy: { originalExpiry: 'asc' }
    });

    // Filter by platform if provided
    let filtered = renewals;
    if (platform) {
      filtered = renewals.filter(r => r.assignment.platform === platform);
    }

    res.json(filtered);
  } catch (error) {
    console.error('Fetch renewals error:', error);
    res.status(500).json({ error: 'Failed to fetch renewals' });
  }
});

// Get renewals by client
router.get('/client/:clientId', authenticate, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status } = req.query;

    const where = {
      clientId,
      ...(status && { status })
    };

    const renewals = await prisma.renewal.findMany({
      where,
      include: {
        assignment: {
          include: {
            vehicle: true,
            device: true
          }
        }
      },
      orderBy: { originalExpiry: 'asc' }
    });

    res.json(renewals);
  } catch (error) {
    console.error('Fetch client renewals error:', error);
    res.status(500).json({ error: 'Failed to fetch client renewals' });
  }
});

// Update renewal status (mark as renewed)
router.put('/:id/renew', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT', 'ACCOUNTS'), async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const existingRenewal = await prisma.renewal.findUnique({ where: { id } });
    if (!existingRenewal) {
      return res.status(404).json({ error: 'Renewal not found' });
    }

    // Calculate new expiry (1 year from original expiry)
    const newExpiry = new Date(existingRenewal.originalExpiry);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    const renewal = await prisma.renewal.update({
      where: { id },
      data: {
        status: 'RENEWED',
        renewalDate: new Date(),
        newExpiry,
        remarks
      },
      include: {
        assignment: {
          include: {
            vehicle: true,
            client: true
          }
        }
      }
    });

    // Update assignment expiry dates
    if (existingRenewal.renewalType === 'CERTIFICATE') {
      await prisma.vehicleAssignment.update({
        where: { id: existingRenewal.assignmentId },
        data: { certificateExpiry: newExpiry }
      });
    } else if (existingRenewal.renewalType === 'SUBSCRIPTION') {
      await prisma.vehicleAssignment.update({
        where: { id: existingRenewal.assignmentId },
        data: { subscriptionExpiry: newExpiry }
      });
    }

    // Create new renewal record for next year
    await prisma.renewal.create({
      data: {
        assignmentId: existingRenewal.assignmentId,
        clientId: existingRenewal.clientId,
        renewalType: existingRenewal.renewalType,
        originalExpiry: newExpiry,
        status: 'UPCOMING'
      }
    });

    await logActivity(req.user.id, 'RENEW', 'RENEWALS', { renewalId: id });

    res.json(renewal);
  } catch (error) {
    console.error('Renew error:', error);
    res.status(500).json({ error: 'Failed to process renewal' });
  }
});

// Update renewal statuses (cron job endpoint or manual trigger)
router.post('/update-statuses', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    // Update to UPCOMING (within 30 days)
    await prisma.renewal.updateMany({
      where: {
        status: { not: 'RENEWED' },
        originalExpiry: {
          gte: today,
          lte: thirtyDaysFromNow
        }
      },
      data: { status: 'UPCOMING' }
    });

    // Update to DUE (today)
    await prisma.renewal.updateMany({
      where: {
        status: { not: 'RENEWED' },
        originalExpiry: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      data: { status: 'DUE' }
    });

    // Update to OVERDUE (past due)
    await prisma.renewal.updateMany({
      where: {
        status: { not: 'RENEWED' },
        originalExpiry: { lt: today }
      },
      data: { status: 'OVERDUE' }
    });

    res.json({ message: 'Renewal statuses updated successfully' });
  } catch (error) {
    console.error('Update renewal statuses error:', error);
    res.status(500).json({ error: 'Failed to update renewal statuses' });
  }
});

export default router;
