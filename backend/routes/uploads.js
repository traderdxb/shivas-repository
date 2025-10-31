import express from 'express';
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, logActivity } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Bulk upload devices
router.post('/devices', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const workbook = XLSX.read(file.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const row of data) {
      try {
        // Expected columns: Model, IMEI, Serial Number, Ownership
        if (!row.Model || !row.IMEI || !row.Ownership) {
          results.failed++;
          results.errors.push({ row, error: 'Missing required fields' });
          continue;
        }

        // Check if device already exists
        const existing = await prisma.device.findUnique({
          where: { imei: row.IMEI.toString() }
        });

        if (existing) {
          results.failed++;
          results.errors.push({ row, error: 'Device with this IMEI already exists' });
          continue;
        }

        await prisma.device.create({
          data: {
            model: row.Model,
            imei: row.IMEI.toString(),
            serialNumber: row['Serial Number']?.toString() || null,
            ownership: row.Ownership.toUpperCase(),
            status: 'AVAILABLE'
          }
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ row, error: error.message });
      }
    }

    await logActivity(req.user.id, 'BULK_UPLOAD_DEVICES', 'UPLOADS', { success: results.success, failed: results.failed });

    res.json({
      message: 'Bulk upload completed',
      results
    });
  } catch (error) {
    console.error('Bulk upload devices error:', error);
    res.status(500).json({ error: 'Failed to upload devices' });
  }
});

// Bulk upload SIMs
router.post('/sims', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = req.files.file;
    const workbook = XLSX.read(file.data, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const row of data) {
      try {
        // Expected columns: Brand, SIM Number, Serial Number, Ownership
        if (!row.Brand || !row['SIM Number'] || !row.Ownership) {
          results.failed++;
          results.errors.push({ row, error: 'Missing required fields' });
          continue;
        }

        // Check if SIM already exists
        const existing = await prisma.sIM.findUnique({
          where: { simNumber: row['SIM Number'].toString() }
        });

        if (existing) {
          results.failed++;
          results.errors.push({ row, error: 'SIM with this number already exists' });
          continue;
        }

        await prisma.sIM.create({
          data: {
            brand: row.Brand,
            simNumber: row['SIM Number'].toString(),
            serialNumber: row['Serial Number']?.toString() || null,
            ownership: row.Ownership.toUpperCase(),
            status: 'AVAILABLE'
          }
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ row, error: error.message });
      }
    }

    await logActivity(req.user.id, 'BULK_UPLOAD_SIMS', 'UPLOADS', { success: results.success, failed: results.failed });

    res.json({
      message: 'Bulk upload completed',
      results
    });
  } catch (error) {
    console.error('Bulk upload SIMs error:', error);
    res.status(500).json({ error: 'Failed to upload SIMs' });
  }
});

// Download template
router.get('/template/:type', authenticate, async (req, res) => {
  try {
    const { type } = req.params;

    let data = [];
    let filename = '';

    if (type === 'devices') {
      data = [
        { Model: 'Teltonika FMC 130', IMEI: '123456789012345', 'Serial Number': 'SN12345', Ownership: 'OWNED' }
      ];
      filename = 'device_upload_template.xlsx';
    } else if (type === 'sims') {
      data = [
        { Brand: 'DU', 'SIM Number': '971501234567', 'Serial Number': 'SIM12345', Ownership: 'LEASING' }
      ];
      filename = 'sim_upload_template.xlsx';
    } else {
      return res.status(400).json({ error: 'Invalid template type' });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({ error: 'Failed to download template' });
  }
});

export default router;
