import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all pending tasks
router.get('/', authenticate, async (req, res) => {
  try {
    const { taskType, status, priority } = req.query;

    const where = {
      ...(taskType && { taskType }),
      ...(status && { status }),
      ...(priority && { priority })
    };

    const tasks = await prisma.pendingTask.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(tasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const task = await prisma.pendingTask.findUnique({
      where: { id: req.params.id }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Fetch task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { taskType, description, vehicleInfo, clientInfo, priority, assignedTo, dueDate, remarks } = req.body;

    if (!taskType || !description) {
      return res.status(400).json({ error: 'Task type and description are required' });
    }

    const task = await prisma.pendingTask.create({
      data: {
        taskType,
        description,
        vehicleInfo,
        clientInfo,
        priority: priority || 'MEDIUM',
        assignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
        remarks,
        status: 'PENDING'
      }
    });

    await logActivity(req.user.id, 'CREATE_TASK', 'TASKS', { taskId: task.id });

    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate);
    }

    if (updates.status === 'COMPLETED' && !updates.completedAt) {
      updates.completedAt = new Date();
    }

    const task = await prisma.pendingTask.update({
      where: { id },
      data: updates
    });

    await logActivity(req.user.id, 'UPDATE_TASK', 'TASKS', { taskId: id });

    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.pendingTask.delete({ where: { id } });

    await logActivity(req.user.id, 'DELETE_TASK', 'TASKS', { taskId: id });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
