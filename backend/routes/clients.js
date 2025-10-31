import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all clients
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, active } = req.query;

    const where = {
      ...(active !== undefined && { active: active === 'true' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json(clients);
  } catch (error) {
    console.error('Fetch clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get client by ID with history
router.get('/:id', authenticate, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: {
          include: {
            device: true,
            vehicle: true,
            sim: true
          },
          orderBy: { createdAt: 'desc' }
        },
        renewals: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (error) {
    console.error('Fetch client error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Create client
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT', 'SALES'), async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const existingClient = await prisma.client.findUnique({ where: { name } });
    if (existingClient) {
      return res.status(400).json({ error: 'Client with this name already exists' });
    }

    const client = await prisma.client.create({
      data: { name, phone, email, address }
    });

    await logActivity(req.user.id, 'CREATE_CLIENT', 'CLIENTS', { clientId: client.id, name });

    res.status(201).json(client);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT', 'SALES'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, active } = req.body;

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(active !== undefined && { active })
      }
    });

    await logActivity(req.user.id, 'UPDATE_CLIENT', 'CLIENTS', { clientId: id });

    res.json(client);
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client (soft delete)
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.client.update({
      where: { id },
      data: { active: false }
    });

    await logActivity(req.user.id, 'DELETE_CLIENT', 'CLIENTS', { clientId: id });

    res.json({ message: 'Client deactivated successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

export default router;
