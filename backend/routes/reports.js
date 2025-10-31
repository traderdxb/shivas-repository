import express from 'express';
import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate activity summary report
router.get('/activity-summary', authenticate, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch all activities
    const installations = await prisma.vehicleAssignment.findMany({
      where: {
        installationDate: { gte: start, lte: end },
        jobType: 'NEW_INSTALLATION'
      },
      include: {
        device: true,
        vehicle: true,
        client: true,
        installer: { select: { name: true } }
      }
    });

    const transfers = await prisma.vehicleAssignment.findMany({
      where: {
        installationDate: { gte: start, lte: end },
        jobType: 'TRANSFER_INSTALLATION'
      },
      include: {
        device: true,
        vehicle: true,
        client: true,
        installer: { select: { name: true } }
      }
    });

    const removals = await prisma.removal.findMany({
      where: {
        removalDate: { gte: start, lte: end }
      },
      include: {
        vehicle: true,
        user: { select: { name: true } }
      }
    });

    const replacements = await prisma.replacement.findMany({
      where: {
        replacementDate: { gte: start, lte: end }
      },
      include: {
        oldDevice: true,
        newDevice: true,
        assignment: {
          include: {
            vehicle: true,
            client: true
          }
        },
        user: { select: { name: true } }
      }
    });

    const renewals = await prisma.renewal.findMany({
      where: {
        renewalDate: { gte: start, lte: end },
        status: 'RENEWED'
      },
      include: {
        client: true,
        assignment: {
          include: {
            vehicle: true
          }
        }
      }
    });

    const report = {
      period: { startDate, endDate },
      summary: {
        totalInstallations: installations.length,
        totalTransfers: transfers.length,
        totalRemovals: removals.length,
        totalReplacements: replacements.length,
        totalRenewals: renewals.length
      },
      installations,
      transfers,
      removals,
      replacements,
      renewals
    };

    if (format === 'excel') {
      // Generate Excel file
      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ['Activity Summary Report'],
        ['Period:', `${startDate} to ${endDate}`],
        [''],
        ['Activity', 'Count'],
        ['Installations', installations.length],
        ['Transfers', transfers.length],
        ['Removals', removals.length],
        ['Replacements', replacements.length],
        ['Renewals', renewals.length]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

      // Installations sheet
      if (installations.length > 0) {
        const installData = installations.map(i => ({
          Date: i.installationDate.toISOString().split('T')[0],
          Client: i.client.name,
          Vehicle: i.vehicle.plateNumber,
          Device: i.device.model,
          IMEI: i.device.imei,
          Platform: i.platform,
          Location: i.location,
          Installer: i.installer?.name || 'N/A'
        }));
        const installSheet = XLSX.utils.json_to_sheet(installData);
        XLSX.utils.book_append_sheet(wb, installSheet, 'Installations');
      }

      // Removals sheet
      if (removals.length > 0) {
        const removalData = removals.map(r => ({
          Date: r.removalDate.toISOString().split('T')[0],
          Vehicle: r.vehicle.plateNumber,
          Reason: r.reason,
          'Removed By': r.user.name,
          Remarks: r.remarks || 'N/A'
        }));
        const removalSheet = XLSX.utils.json_to_sheet(removalData);
        XLSX.utils.book_append_sheet(wb, removalSheet, 'Removals');
      }

      // Write to buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=activity_summary_${startDate}_to_${endDate}.xlsx`);
      res.send(buffer);
    } else {
      res.json(report);
    }
  } catch (error) {
    console.error('Generate activity report error:', error);
    res.status(500).json({ error: 'Failed to generate activity report' });
  }
});

// Export inventory
router.get('/export/inventory', authenticate, async (req, res) => {
  try {
    const { type = 'devices' } = req.query;

    if (type === 'devices') {
      const devices = await prisma.device.findMany({
        orderBy: { model: 'asc' }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(devices.map(d => ({
        Model: d.model,
        IMEI: d.imei,
        'Serial Number': d.serialNumber || 'N/A',
        Ownership: d.ownership,
        Status: d.status,
        'Added Date': d.addedDate.toISOString().split('T')[0]
      })));

      XLSX.utils.book_append_sheet(wb, ws, 'Devices');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=device_inventory.xlsx');
      res.send(buffer);
    } else if (type === 'sims') {
      const sims = await prisma.sIM.findMany({
        orderBy: { brand: 'asc' }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sims.map(s => ({
        Brand: s.brand,
        'SIM Number': s.simNumber,
        'Serial Number': s.serialNumber || 'N/A',
        Ownership: s.ownership,
        Status: s.status,
        'Added Date': s.addedDate.toISOString().split('T')[0]
      })));

      XLSX.utils.book_append_sheet(wb, ws, 'SIMs');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=sim_inventory.xlsx');
      res.send(buffer);
    } else {
      return res.status(400).json({ error: 'Invalid type' });
    }
  } catch (error) {
    console.error('Export inventory error:', error);
    res.status(500).json({ error: 'Failed to export inventory' });
  }
});

// Export platform masterlist
router.get('/export/masterlist', authenticate, async (req, res) => {
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

    const wb = XLSX.utils.book_new();
    const data = assignments.map(a => ({
      Platform: a.platform,
      Client: a.client.name,
      'Vehicle Plate': a.vehicle.plateNumber,
      'Vehicle Make': a.vehicle.make,
      'Vehicle Model': a.vehicle.model,
      'Chassis Number': a.vehicle.chassisNumber || 'N/A',
      'Device Model': a.device.model,
      IMEI: a.device.imei,
      'SIM Brand': a.sim?.brand || 'N/A',
      'SIM Number': a.sim?.simNumber || 'N/A',
      'Installation Date': a.installationDate.toISOString().split('T')[0],
      'Activation Date': a.activationDate.toISOString().split('T')[0],
      'Certificate Expiry': a.certificateExpiry.toISOString().split('T')[0],
      'Subscription Expiry': a.subscriptionExpiry.toISOString().split('T')[0],
      Location: a.location
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, platform || 'All Platforms');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = platform ? `${platform}_masterlist.xlsx` : 'platform_masterlist.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  } catch (error) {
    console.error('Export masterlist error:', error);
    res.status(500).json({ error: 'Failed to export masterlist' });
  }
});

// Generate ITC Certificate
router.post('/generate-certificate', authenticate, authorize('ADMIN', 'MANAGER', 'SUPPORT'), async (req, res) => {
  try {
    const { assignmentId } = req.body;

    if (!assignmentId) {
      return res.status(400).json({ error: 'Assignment ID is required' });
    }

    const assignment = await prisma.vehicleAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        device: true,
        vehicle: true,
        client: true
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const certificatesDir = path.join(__dirname, '../certificates');
    if (!fs.existsSync(certificatesDir)) {
      fs.mkdirSync(certificatesDir, { recursive: true });
    }

    const filename = `ITC_Certificate_${assignment.vehicle.plateNumber}_${Date.now()}.pdf`;
    const filepath = path.join(certificatesDir, filename);
    const writeStream = fs.createWriteStream(filepath);

    doc.pipe(writeStream);

    // Header
    doc.fontSize(20).text('ITC CERTIFICATE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('Certificate of Installation', { align: 'center' });
    doc.moveDown(2);

    // Content
    doc.fontSize(11);
    doc.text(`Certificate No: ITC-${Date.now()}`, { align: 'left' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'left' });
    doc.moveDown();

    doc.text('This is to certify that:', { underline: true });
    doc.moveDown();

    doc.text(`Client Name: ${assignment.client.name}`);
    doc.text(`Vehicle Plate Number: ${assignment.vehicle.plateNumber}`);
    doc.text(`Vehicle Make/Model: ${assignment.vehicle.make} ${assignment.vehicle.model}`);
    doc.text(`Device Model: ${assignment.device.model}`);
    doc.text(`Device IMEI: ${assignment.device.imei}`);
    doc.text(`Platform: ${assignment.platform}`);
    doc.text(`Installation Date: ${assignment.installationDate.toLocaleDateString()}`);
    doc.text(`Activation Date: ${assignment.activationDate.toLocaleDateString()}`);
    doc.text(`Certificate Expiry: ${assignment.certificateExpiry.toLocaleDateString()}`);

    doc.moveDown(2);
    doc.text('has been successfully installed and activated according to industry standards.');
    doc.moveDown(3);

    // Signature section
    doc.text('_______________________', 100, doc.y);
    doc.text('Authorized Signature', 100, doc.y + 5);

    doc.text('_______________________', 350, doc.y - 15);
    doc.text('Company Stamp', 350, doc.y + 5);

    doc.end();

    writeStream.on('finish', () => {
      res.json({
        message: 'Certificate generated successfully',
        filename,
        downloadUrl: `/certificates/${filename}`
      });
    });

    writeStream.on('error', (error) => {
      console.error('Certificate generation error:', error);
      res.status(500).json({ error: 'Failed to generate certificate' });
    });
  } catch (error) {
    console.error('Generate certificate error:', error);
    res.status(500).json({ error: 'Failed to generate certificate' });
  }
});

export default router;
