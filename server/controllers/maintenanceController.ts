import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Maintenance, IMaintenance } from '../models/Maintenance.js';
import { Breakdown, IBreakdown } from '../models/Breakdown.js';
import { Equipment } from '../models/Equipment.js';
import { initialMaintenanceRecords, initialBreakdownRecords } from '../services/maintenanceSeed.js';
import { inMemoryEquipmentStore } from './equipmentController.js';

// In-Memory fallbacks when MongoDB is disconnected
export let inMemoryMaintenanceStore: any[] = initialMaintenanceRecords.map((m, idx) => ({
  _id: `mnt-init-${idx + 1}`,
  ...m,
  createdAt: new Date(Date.now() - (idx + 1) * 86400000),
  updatedAt: new Date(Date.now() - (idx + 1) * 43200000),
}));

export let inMemoryBreakdownStore: any[] = initialBreakdownRecords.map((b, idx) => ({
  _id: `brk-init-${idx + 1}`,
  ...b,
  createdAt: new Date(Date.now() - (idx + 1) * 86400000),
  updatedAt: new Date(Date.now() - (idx + 1) * 43200000),
}));

export const seedMaintenanceDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const countM = await Maintenance.countDocuments();
    if (countM === 0) {
      console.log('🌱 Seeding default mining maintenance schedule records...');
      await Maintenance.insertMany(initialMaintenanceRecords);
      console.log(`✅ Seeded ${initialMaintenanceRecords.length} maintenance records into MongoDB`);
    }

    const countB = await Breakdown.countDocuments();
    if (countB === 0) {
      console.log('🌱 Seeding default equipment breakdown incident logs...');
      await Breakdown.insertMany(initialBreakdownRecords);
      console.log(`✅ Seeded ${initialBreakdownRecords.length} breakdown logs into MongoDB`);
    }
  } catch (err: any) {
    console.warn(`[Maintenance Seed Warning]: Could not seed to Mongo Atlas (${err.message}). Using in-memory fallback.`);
  }
};

// ==========================================
// MAINTENANCE CONTROLLERS
// ==========================================

export const getAllMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, priority, type, equipmentId, search } = req.query;

    let mongoConnected = false;
    let records: any[] = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = {};
        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (type) query.type = type;
        if (equipmentId) query.equipmentId = equipmentId;
        if (search) {
          query.$or = [
            { maintenanceId: { $regex: String(search), $options: 'i' } },
            { equipmentId: { $regex: String(search), $options: 'i' } },
            { equipmentName: { $regex: String(search), $options: 'i' } },
            { assignedTechnician: { $regex: String(search), $options: 'i' } },
            { description: { $regex: String(search), $options: 'i' } },
          ];
        }

        records = await Maintenance.find(query).sort({ scheduledDate: -1 });
        mongoConnected = true;
      } catch {
        mongoConnected = false;
      }
    }

    if (!mongoConnected) {
      let filtered = [...inMemoryMaintenanceStore];
      if (status) filtered = filtered.filter(m => m.status === status);
      if (priority) filtered = filtered.filter(m => m.priority === priority);
      if (type) filtered = filtered.filter(m => m.type === type);
      if (equipmentId) filtered = filtered.filter(m => m.equipmentId.toUpperCase() === String(equipmentId).toUpperCase());
      if (search) {
        const s = String(search).toLowerCase();
        filtered = filtered.filter(m =>
          m.maintenanceId.toLowerCase().includes(s) ||
          m.equipmentId.toLowerCase().includes(s) ||
          m.equipmentName.toLowerCase().includes(s) ||
          m.assignedTechnician.toLowerCase().includes(s) ||
          m.description.toLowerCase().includes(s)
        );
      }
      filtered.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
      records = filtered;
    }

    // Aggregated stats
    const stats = {
      total: records.length,
      scheduled: records.filter(m => m.status === 'Scheduled').length,
      inProgress: records.filter(m => m.status === 'In-Progress').length,
      completed: records.filter(m => m.status === 'Completed').length,
      critical: records.filter(m => m.priority === 'Critical').length,
      totalCost: records.reduce((sum, m) => sum + (Number(m.cost) || 0), 0),
      totalDowntime: records.reduce((sum, m) => sum + (Number(m.downtimeHours) || 0), 0),
    };

    res.status(200).json({
      success: true,
      count: records.length,
      stats,
      dataSource: mongoConnected ? 'MongoDB Atlas' : 'InMemory (Atlas Sync Ready)',
      data: records,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Server error retrieving maintenance records', error: err.message });
  }
};

export const createMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      equipmentId,
      equipmentName,
      type,
      priority,
      status,
      scheduledDate,
      assignedTechnician,
      description,
      cost,
      downtimeHours,
      partsReplaced,
      notes,
    } = req.body;

    const finalEqId = (equipmentId || 'EXC-001').toUpperCase();
    const finalTechnician = (assignedTechnician || 'Senior Fleet Tech (On-Duty)').trim();
    const finalDesc = (description || `${type || 'Preventive'} maintenance service & inspection`).trim();

    // Resolve equipment name if missing
    let resolvedName = equipmentName;
    if (!resolvedName) {
      const eq = inMemoryEquipmentStore.find(e => e.equipmentId.toUpperCase() === finalEqId);
      resolvedName = eq ? eq.name : `Mining Asset ${finalEqId}`;
    }

    const maintenanceId = `MNT-${Date.now().toString().slice(-4)}`;

    const newRecord: any = {
      maintenanceId,
      equipmentId: finalEqId,
      equipmentName: resolvedName,
      type: type || 'Preventive',
      priority: priority || 'Medium',
      status: status || 'Scheduled',
      scheduledDate: scheduledDate ? new Date(scheduledDate) : new Date(),
      assignedTechnician: finalTechnician,
      description: finalDesc,
      cost: cost !== undefined ? Number(cost) : 1200,
      downtimeHours: downtimeHours !== undefined ? Number(downtimeHours) : 4,
      partsReplaced: Array.isArray(partsReplaced) ? partsReplaced : partsReplaced ? [partsReplaced] : [],
      notes: notes || '',
    };

    // If equipment is put in maintenance, update its status
    if (newRecord.status === 'In-Progress') {
      const eqIdx = inMemoryEquipmentStore.findIndex(e => e.equipmentId.toUpperCase() === newRecord.equipmentId);
      if (eqIdx !== -1) {
        inMemoryEquipmentStore[eqIdx].status = 'Maintenance';
      }
      if (mongoose.connection.readyState === 1) {
        try {
          await Equipment.findOneAndUpdate(
            { equipmentId: newRecord.equipmentId },
            { status: 'Maintenance' }
          );
        } catch {}
      }
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const created = await Maintenance.create(newRecord);
        // Keep in-memory store synchronized as well
        const plainObj = created.toObject ? created.toObject() : { ...newRecord, _id: created._id };
        inMemoryMaintenanceStore.unshift(plainObj);

        res.status(201).json({
          success: true,
          message: 'Maintenance task scheduled successfully.',
          data: created,
        });
        return;
      } catch {}
    }

    newRecord._id = `mnt-${Date.now()}`;
    newRecord.createdAt = new Date();
    newRecord.updatedAt = new Date();
    inMemoryMaintenanceStore.unshift(newRecord);

    res.status(201).json({
      success: true,
      message: 'Maintenance task scheduled successfully.',
      data: newRecord,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Server error scheduling maintenance', error: err.message });
  }
};

export const updateMaintenance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.status === 'Completed' && !updates.completionDate) {
      updates.completionDate = new Date();
    }

    // If completed, update equipment status back to 'Running' or 'Idle'
    if (updates.status === 'Completed' && updates.equipmentId) {
      const eqIdx = inMemoryEquipmentStore.findIndex(e => e.equipmentId.toUpperCase() === updates.equipmentId.toUpperCase());
      if (eqIdx !== -1 && inMemoryEquipmentStore[eqIdx].status === 'Maintenance') {
        inMemoryEquipmentStore[eqIdx].status = 'Running';
        inMemoryEquipmentStore[eqIdx].healthStatus = 'Good';
        inMemoryEquipmentStore[eqIdx].lastMaintenanceDate = new Date().toISOString();
        inMemoryEquipmentStore[eqIdx].nextMaintenanceDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }
      if (mongoose.connection.readyState === 1) {
        try {
          await Equipment.findOneAndUpdate(
            { equipmentId: updates.equipmentId.toUpperCase() },
            {
              status: 'Running',
              healthStatus: 'Good',
              lastMaintenanceDate: new Date(),
              nextMaintenanceDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }
          );
        } catch {}
      }
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const updated = await Maintenance.findOneAndUpdate(
          { $or: [{ maintenanceId: id.toUpperCase() }, { _id: id }] },
          updates,
          { new: true, runValidators: true }
        );
        if (updated) {
          // Synchronize in-memory record
          const index = inMemoryMaintenanceStore.findIndex(
            m => m.maintenanceId.toUpperCase() === id.toUpperCase() || m._id === id
          );
          if (index !== -1) {
            inMemoryMaintenanceStore[index] = {
              ...inMemoryMaintenanceStore[index],
              ...updates,
              updatedAt: new Date(),
            };
          }
          res.status(200).json({ success: true, message: 'Maintenance record updated.', data: updated });
          return;
        }
      } catch {}
    }

    const index = inMemoryMaintenanceStore.findIndex(
      m => m.maintenanceId.toUpperCase() === id.toUpperCase() || m._id === id
    );

    if (index === -1) {
      res.status(404).json({ success: false, message: `Maintenance record '${id}' not found.` });
      return;
    }

    inMemoryMaintenanceStore[index] = {
      ...inMemoryMaintenanceStore[index],
      ...updates,
      updatedAt: new Date(),
    };

    res.status(200).json({
      success: true,
      message: 'Maintenance record updated (InMemory).',
      data: inMemoryMaintenanceStore[index],
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Server error updating maintenance', error: err.message });
  }
};

// ==========================================
// BREAKDOWN INCIDENT CONTROLLERS
// ==========================================

export const getAllBreakdowns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, severity, faultCategory, equipmentId, search } = req.query;

    let mongoConnected = false;
    let records: any[] = [];

    if (mongoose.connection.readyState === 1) {
      try {
        const query: any = {};
        if (status) query.status = status;
        if (severity) query.severity = severity;
        if (faultCategory) query.faultCategory = faultCategory;
        if (equipmentId) query.equipmentId = equipmentId;
        if (search) {
          query.$or = [
            { breakdownId: { $regex: String(search), $options: 'i' } },
            { equipmentId: { $regex: String(search), $options: 'i' } },
            { equipmentName: { $regex: String(search), $options: 'i' } },
            { reportedBy: { $regex: String(search), $options: 'i' } },
            { symptoms: { $regex: String(search), $options: 'i' } },
            { location: { $regex: String(search), $options: 'i' } },
          ];
        }

        records = await Breakdown.find(query).sort({ reportedAt: -1 });
        mongoConnected = true;
      } catch {
        mongoConnected = false;
      }
    }

    if (!mongoConnected) {
      let filtered = [...inMemoryBreakdownStore];
      if (status) filtered = filtered.filter(b => b.status === status);
      if (severity) filtered = filtered.filter(b => b.severity === severity);
      if (faultCategory) filtered = filtered.filter(b => b.faultCategory === faultCategory);
      if (equipmentId) filtered = filtered.filter(b => b.equipmentId.toUpperCase() === String(equipmentId).toUpperCase());
      if (search) {
        const s = String(search).toLowerCase();
        filtered = filtered.filter(b =>
          b.breakdownId.toLowerCase().includes(s) ||
          b.equipmentId.toLowerCase().includes(s) ||
          b.equipmentName.toLowerCase().includes(s) ||
          b.reportedBy.toLowerCase().includes(s) ||
          b.symptoms.toLowerCase().includes(s) ||
          b.location.toLowerCase().includes(s)
        );
      }
      filtered.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
      records = filtered;
    }

    // Breakdown Stats
    const stats = {
      total: records.length,
      reported: records.filter(b => b.status === 'Reported').length,
      repairing: records.filter(b => b.status === 'Repairing').length,
      resolved: records.filter(b => b.status === 'Resolved').length,
      critical: records.filter(b => b.severity === 'Critical').length,
      totalDowntime: records.reduce((sum, b) => sum + (Number(b.downtimeHours) || 0), 0),
      totalEstimatedCost: records.reduce((sum, b) => sum + (Number(b.estimatedCost) || 0), 0),
    };

    res.status(200).json({
      success: true,
      count: records.length,
      stats,
      dataSource: mongoConnected ? 'MongoDB Atlas' : 'InMemory (Atlas Sync Ready)',
      data: records,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Server error retrieving breakdowns', error: err.message });
  }
};

export const reportBreakdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      equipmentId,
      equipmentName,
      severity,
      faultCategory,
      location,
      symptoms,
      reportedBy,
      estimatedCost,
      downtimeHours,
    } = req.body;

    const finalEqId = (equipmentId || 'EXC-001').toUpperCase();
    const finalSymptoms = (symptoms || 'Abnormal mechanical vibration and hydraulic pressure loss observed').trim();
    const finalLocation = (location || 'Pit Area 4 - Active Worksite').trim();

    // Resolve equipment name if missing
    let resolvedName = equipmentName;
    if (!resolvedName) {
      const eq = inMemoryEquipmentStore.find(e => e.equipmentId.toUpperCase() === finalEqId);
      resolvedName = eq ? eq.name : `Mining Machine ${finalEqId}`;
    }

    const reporterName = reportedBy || (req as any).user?.name || 'Field Operator';
    const breakdownId = `BRK-${Date.now().toString().slice(-4)}`;

    const newBreakdown: any = {
      breakdownId,
      equipmentId: finalEqId,
      equipmentName: resolvedName,
      reportedBy: reporterName,
      reportedAt: new Date(),
      severity: severity || 'High',
      status: 'Reported',
      faultCategory: faultCategory || 'Engine',
      location: finalLocation,
      symptoms: finalSymptoms,
      estimatedCost: estimatedCost ? Number(estimatedCost) : 3500,
      downtimeHours: downtimeHours ? Number(downtimeHours) : 8,
    };

    // Automatically set equipment status to 'Breakdown' and health to 'Critical'
    const eqIdx = inMemoryEquipmentStore.findIndex(e => e.equipmentId.toUpperCase() === finalEqId);
    if (eqIdx !== -1) {
      inMemoryEquipmentStore[eqIdx].status = 'Breakdown';
      inMemoryEquipmentStore[eqIdx].healthStatus = 'Critical';
    }
    if (mongoose.connection.readyState === 1) {
      try {
        await Equipment.findOneAndUpdate(
          { equipmentId: finalEqId },
          { status: 'Breakdown', healthStatus: 'Critical' }
        );
      } catch {}
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const created = await Breakdown.create(newBreakdown);
        const plainObj = created.toObject ? created.toObject() : { ...newBreakdown, _id: created._id };
        inMemoryBreakdownStore.unshift(plainObj);

        res.status(201).json({
          success: true,
          message: `Breakdown incident ${breakdownId} logged. Equipment status updated to Breakdown.`,
          data: created,
        });
        return;
      } catch {}
    }

    newBreakdown._id = `brk-${Date.now()}`;
    newBreakdown.createdAt = new Date();
    newBreakdown.updatedAt = new Date();
    inMemoryBreakdownStore.unshift(newBreakdown);

    res.status(201).json({
      success: true,
      message: `Breakdown incident ${breakdownId} logged. Equipment status updated to Breakdown.`,
      data: newBreakdown,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Server error reporting breakdown', error: err.message });
  }
};

export const updateBreakdownStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, rootCause, resolutionNotes, downtimeHours, estimatedCost } = req.body;

    const updates: any = {};
    if (status) updates.status = status;
    if (rootCause) updates.rootCause = rootCause;
    if (resolutionNotes) updates.resolutionNotes = resolutionNotes;
    if (downtimeHours !== undefined) updates.downtimeHours = Number(downtimeHours);
    if (estimatedCost !== undefined) updates.estimatedCost = Number(estimatedCost);

    if (status === 'Resolved') {
      updates.resolvedAt = new Date();
      updates.resolvedBy = (req as any).user?.name || 'Maintenance Lead';
    }

    let targetEquipmentId = '';

    if (mongoose.connection.readyState === 1) {
      try {
        const updated = await Breakdown.findOneAndUpdate(
          { $or: [{ breakdownId: id.toUpperCase() }, { _id: id }] },
          updates,
          { new: true }
        );
        if (updated) {
          targetEquipmentId = updated.equipmentId;
        }
      } catch {}
    }

    const index = inMemoryBreakdownStore.findIndex(
      b => b.breakdownId.toUpperCase() === id.toUpperCase() || b._id === id
    );

    if (index !== -1) {
      inMemoryBreakdownStore[index] = {
        ...inMemoryBreakdownStore[index],
        ...updates,
        updatedAt: new Date(),
      };
      targetEquipmentId = inMemoryBreakdownStore[index].equipmentId;
    }

    // If resolved, return machine to Idle/Running and Good health
    if (status === 'Resolved' && targetEquipmentId) {
      const eqIdx = inMemoryEquipmentStore.findIndex(e => e.equipmentId.toUpperCase() === targetEquipmentId.toUpperCase());
      if (eqIdx !== -1 && inMemoryEquipmentStore[eqIdx].status === 'Breakdown') {
        inMemoryEquipmentStore[eqIdx].status = 'Idle';
        inMemoryEquipmentStore[eqIdx].healthStatus = 'Good';
      }
      if (mongoose.connection.readyState === 1) {
        try {
          await Equipment.findOneAndUpdate(
            { equipmentId: targetEquipmentId.toUpperCase() },
            { status: 'Idle', healthStatus: 'Good' }
          );
        } catch {}
      }
    }

    res.status(200).json({
      success: true,
      message: `Breakdown incident status updated to '${status}'.`,
      data: index !== -1 ? inMemoryBreakdownStore[index] : updates,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Server error updating breakdown', error: err.message });
  }
};
