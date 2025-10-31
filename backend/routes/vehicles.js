import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all vehicles
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, make, model } = req.query;

    const where = {
      ...(make && { make }),
      ...(model && { model }),
      ...(search && {
        OR: [
          { plateNumber: { contains: search, mode: 'insensitive' } },
          { chassisNumber: { contains: search, mode: 'insensitive' } },
          { make: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: { plateNumber: 'asc' }
    });

    res.json(vehicles);
  } catch (error) {
    console.error('Fetch vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Get vehicle by ID with history
router.get('/:id', authenticate, async (req, res) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: {
          include: {
            device: true,
            sim: true,
            client: true
          },
          orderBy: { createdAt: 'desc' }
        },
        removals: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Fetch vehicle error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

// Create vehicle
router.post('/', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { make, model, plateNumber, chassisNumber } = req.body;

    if (!make || !model || !plateNumber) {
      return res.status(400).json({ error: 'Make, model, and plate number are required' });
    }

    const existingVehicle = await prisma.vehicle.findUnique({ where: { plateNumber } });
    if (existingVehicle) {
      return res.status(400).json({ error: 'Vehicle with this plate number already exists' });
    }

    const vehicle = await prisma.vehicle.create({
      data: { make, model, plateNumber, chassisNumber }
    });

    await logActivity(req.user.id, 'CREATE_VEHICLE', 'VEHICLES', { vehicleId: vehicle.id, plateNumber });

    res.status(201).json(vehicle);
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

// Update vehicle
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { id } = req.params;
    const { make, model, chassisNumber } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(make && { make }),
        ...(model && { model }),
        ...(chassisNumber !== undefined && { chassisNumber })
      }
    });

    await logActivity(req.user.id, 'UPDATE_VEHICLE', 'VEHICLES', { vehicleId: id });

    res.json(vehicle);
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// Delete vehicle
router.delete('/:id', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if vehicle has active assignments
    const activeAssignments = await prisma.vehicleAssignment.findMany({
      where: { vehicleId: id, active: true }
    });

    if (activeAssignments.length > 0) {
      return res.status(400).json({ error: 'Cannot delete vehicle with active assignments' });
    }

    await prisma.vehicle.delete({ where: { id } });

    await logActivity(req.user.id, 'DELETE_VEHICLE', 'VEHICLES', { vehicleId: id });

    res.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

export default router;
