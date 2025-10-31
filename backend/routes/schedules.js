import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all job schedules
router.get('/', authenticate, async (req, res) => {
  try {
    const { technicianId, status, startDate, endDate } = req.query;

    const where = {
      ...(technicianId && { technicianId }),
      ...(status && { status }),
      ...(startDate && endDate && {
        scheduledDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      })
    };

    const schedules = await prisma.jobSchedule.findMany({
      where,
      include: {
        technician: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { scheduledTime: 'asc' }
      ]
    });

    res.json(schedules);
  } catch (error) {
    console.error('Fetch schedules error:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Create job schedule
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { taskId, technicianId, scheduledDate, scheduledTime, jobDetails, remarks } = req.body;

    if (!technicianId || !scheduledDate || !scheduledTime || !jobDetails) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const schedule = await prisma.jobSchedule.create({
      data: {
        taskId,
        technicianId,
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        jobDetails,
        remarks,
        whatsappSent: false,
        status: 'PENDING'
      },
      include: {
        technician: true
      }
    });

    await logActivity(req.user.id, 'CREATE_SCHEDULE', 'SCHEDULES', { scheduleId: schedule.id });

    // TODO: Integrate WhatsApp API to send notification
    // sendWhatsAppNotification(schedule.technician.phone, jobDetails);

    res.status(201).json(schedule);
  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// Update job schedule
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.scheduledDate) {
      updates.scheduledDate = new Date(updates.scheduledDate);
    }

    const schedule = await prisma.jobSchedule.update({
      where: { id },
      data: updates,
      include: {
        technician: true
      }
    });

    await logActivity(req.user.id, 'UPDATE_SCHEDULE', 'SCHEDULES', { scheduleId: id });

    res.json(schedule);
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Send WhatsApp notification
router.post('/:id/send-notification', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await prisma.jobSchedule.findUnique({
      where: { id },
      include: { technician: true }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    // TODO: Implement WhatsApp API integration
    // const sent = await sendWhatsAppMessage(schedule.technician.phone, schedule.jobDetails);

    await prisma.jobSchedule.update({
      where: { id },
      data: { whatsappSent: true }
    });

    res.json({ message: 'WhatsApp notification sent successfully' });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Delete schedule
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.jobSchedule.delete({ where: { id } });

    await logActivity(req.user.id, 'DELETE_SCHEDULE', 'SCHEDULES', { scheduleId: id });

    res.json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

export default router;
