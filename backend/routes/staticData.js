import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get static data by category
router.get('/:category', authenticate, async (req, res) => {
  try {
    const { category } = req.params;
    const { active } = req.query;

    const where = {
      category,
      ...(active !== undefined && { active: active === 'true' })
    };

    const data = await prisma.staticData.findMany({
      where,
      orderBy: { value: 'asc' }
    });

    res.json(data);
  } catch (error) {
    console.error('Fetch static data error:', error);
    res.status(500).json({ error: 'Failed to fetch static data' });
  }
});

// Get all categories
router.get('/', authenticate, async (req, res) => {
  try {
    const data = await prisma.staticData.findMany({
      where: { active: true },
      orderBy: [
        { category: 'asc' },
        { value: 'asc' }
      ]
    });

    // Group by category
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json(grouped);
  } catch (error) {
    console.error('Fetch all static data error:', error);
    res.status(500).json({ error: 'Failed to fetch static data' });
  }
});

// Add new static data
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { category, value } = req.body;

    if (!category || !value) {
      return res.status(400).json({ error: 'Category and value are required' });
    }

    const existing = await prisma.staticData.findUnique({
      where: { category_value: { category, value } }
    });

    if (existing) {
      return res.status(400).json({ error: 'This value already exists in the category' });
    }

    const data = await prisma.staticData.create({
      data: { category, value, active: true }
    });

    await logActivity(req.user.id, 'ADD_STATIC_DATA', 'STATIC_DATA', { category, value });

    res.status(201).json(data);
  } catch (error) {
    console.error('Add static data error:', error);
    res.status(500).json({ error: 'Failed to add static data' });
  }
});

// Update static data
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { value, active } = req.body;

    const data = await prisma.staticData.update({
      where: { id },
      data: {
        ...(value && { value }),
        ...(active !== undefined && { active })
      }
    });

    await logActivity(req.user.id, 'UPDATE_STATIC_DATA', 'STATIC_DATA', { id });

    res.json(data);
  } catch (error) {
    console.error('Update static data error:', error);
    res.status(500).json({ error: 'Failed to update static data' });
  }
});

// Delete static data (soft delete)
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.staticData.update({
      where: { id },
      data: { active: false }
    });

    await logActivity(req.user.id, 'DELETE_STATIC_DATA', 'STATIC_DATA', { id });

    res.json({ message: 'Static data deactivated successfully' });
  } catch (error) {
    console.error('Delete static data error:', error);
    res.status(500).json({ error: 'Failed to delete static data' });
  }
});

export default router;
