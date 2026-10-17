import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Equipment } from '../models/Equipment.js';
import { initialEquipmentFleet, EquipmentRecord } from '../services/equipmentSeed.js';

// In-memory store for fallback/instant response when MongoDB Atlas is offline or connecting
export let memoryFleet: EquipmentRecord[] = [...initialEquipmentFleet];
export const inMemoryEquipmentStore = memoryFleet;

// Seed MongoDB if connected and empty
export const seedEquipmentToMongo = async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    const count = await Equipment.countDocuments();
    if (count === 0) {
      await Equipment.insertMany(initialEquipmentFleet);
      console.log('✅ [MongoDB] Seeded initial mining equipment fleet.');
    }
  } catch (err) {
    console.warn('Equipment seeding check:', err);
  }
};

// @desc    Get all equipment with search & filters
// @route   GET /api/equipment
// @access  Public (Authenticated/Crew)
export const getAllEquipment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, type, status, healthStatus, sort } = req.query;

    // Use MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      let query: any = {};

      if (search) {
        const searchRegex = new RegExp(String(search), 'i');
        query.$or = [
          { equipmentId: searchRegex },
          { name: searchRegex },
          { model: searchRegex },
          { manufacturer: searchRegex },
          { location: searchRegex },
          { assignedOperator: searchRegex },
        ];
      }

      if (type && type !== 'All') {
        query.type = type;
      }

      if (status && status !== 'All') {
        query.status = status;
      }

      if (healthStatus && healthStatus !== 'All') {
        query.healthStatus = healthStatus;
      }

      let sortOptions: any = { createdAt: -1 };
      if (sort === 'engineHours_desc') sortOptions = { engineHours: -1 };
      if (sort === 'utilization_desc') sortOptions = { utilization: -1 };
      if (sort === 'temperature_desc') sortOptions = { temperature: -1 };
      if (sort === 'equipmentId_asc') sortOptions = { equipmentId: 1 };

      const equipment = await Equipment.find(query).sort(sortOptions);

      res.status(200).json({
        success: true,
        count: equipment.length,
        dataSource: 'MongoDB',
        data: equipment,
      });
      return;
    }

    // Fallback in-memory query
    let filtered = [...memoryFleet];

    if (search) {
      const term = String(search).toLowerCase();
      filtered = filtered.filter(
        (eq) =>
          eq.equipmentId.toLowerCase().includes(term) ||
          eq.name.toLowerCase().includes(term) ||
          eq.location.toLowerCase().includes(term) ||
          eq.assignedOperator.toLowerCase().includes(term) ||
          eq.manufacturer.toLowerCase().includes(term)
      );
    }

    if (type && type !== 'All') {
      filtered = filtered.filter((eq) => eq.type === type);
    }

    if (status && status !== 'All') {
      filtered = filtered.filter((eq) => eq.status === status);
    }

    if (healthStatus && healthStatus !== 'All') {
      filtered = filtered.filter((eq) => eq.healthStatus === healthStatus);
    }

    if (sort === 'engineHours_desc') filtered.sort((a, b) => b.engineHours - a.engineHours);
    if (sort === 'utilization_desc') filtered.sort((a, b) => b.utilization - a.utilization);
    if (sort === 'temperature_desc') filtered.sort((a, b) => b.temperature - a.temperature);
    if (sort === 'equipmentId_asc') filtered.sort((a, b) => a.equipmentId.localeCompare(b.equipmentId));

    res.status(200).json({
      success: true,
      count: filtered.length,
      dataSource: 'InMemory (Atlas Sync Ready)',
      data: filtered,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve equipment list.',
      error: error.message,
    });
  }
};

// @desc    Get single equipment details by ID
// @route   GET /api/equipment/:id
// @access  Public
export const getEquipmentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const equipment =
        (await Equipment.findOne({ equipmentId: id.toUpperCase() })) ||
        (mongoose.isValidObjectId(id) ? await Equipment.findById(id) : null);

      if (!equipment) {
        res.status(404).json({
          success: false,
          message: `Equipment with identifier '${id}' not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: equipment,
      });
      return;
    }

    const item = memoryFleet.find(
      (eq) => eq.equipmentId.toUpperCase() === id.toUpperCase() || eq._id === id
    );

    if (!item) {
      res.status(404).json({
        success: false,
        message: `Equipment with identifier '${id}' not found in registry.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching equipment details.',
      error: error.message,
    });
  }
};

// @desc    Add new mining equipment
// @route   POST /api/equipment
// @access  Private (Admin Role Only)
export const createEquipment = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      equipmentId,
      name,
      type,
      model,
      manufacturer,
      year,
      status,
      location,
      engineHours,
      fuelCapacity,
      currentFuelLevel,
      temperature,
      utilization,
      assignedOperator,
      lastMaintenanceDate,
      nextMaintenanceDate,
      healthStatus,
    } = req.body;

    if (!equipmentId || !name || !type) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: equipmentId, name, type.',
      });
      return;
    }

    const upperId = equipmentId.trim().toUpperCase();
    const finalModel = model || 'Standard Mining Spec';
    const finalManufacturer = manufacturer || 'Caterpillar';
    const finalFuelCapacity = Number(fuelCapacity) || 1500;

    if (mongoose.connection.readyState === 1) {
      const existing = await Equipment.findOne({ equipmentId: upperId });
      if (existing) {
        res.status(400).json({
          success: false,
          message: `Equipment with ID '${upperId}' already exists in database.`,
        });
        return;
      }

      const newEquipment = await Equipment.create({
        equipmentId: upperId,
        name,
        type,
        model: finalModel,
        manufacturer: finalManufacturer,
        year: Number(year) || new Date().getFullYear(),
        status: status || 'Idle',
        location: location || 'Pit Zone A',
        engineHours: Number(engineHours) || 0,
        fuelCapacity: finalFuelCapacity,
        currentFuelLevel: Number(currentFuelLevel) ?? 100,
        temperature: Number(temperature) || 65,
        utilization: Number(utilization) || 0,
        assignedOperator: assignedOperator || 'Unassigned',
        lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : new Date(),
        nextMaintenanceDate: nextMaintenanceDate
          ? new Date(nextMaintenanceDate)
          : new Date(Date.now() + 30 * 86400000),
        healthStatus: healthStatus || 'Good',
      });

      res.status(201).json({
        success: true,
        message: 'Mining equipment registered successfully in MongoDB.',
        data: newEquipment,
      });
      return;
    }

    // In-memory insertion
    const exists = memoryFleet.some((eq) => eq.equipmentId.toUpperCase() === upperId);
    if (exists) {
      res.status(400).json({
        success: false,
        message: `Equipment with ID '${upperId}' already exists.`,
      });
      return;
    }

    const memoryItem: EquipmentRecord = {
      _id: `eq-${Date.now()}`,
      equipmentId: upperId,
      name,
      type,
      model: finalModel,
      manufacturer: finalManufacturer,
      year: Number(year) || new Date().getFullYear(),
      status: status || 'Idle',
      location: location || 'Pit Zone A',
      engineHours: Number(engineHours) || 0,
      fuelCapacity: finalFuelCapacity,
      currentFuelLevel: Number(currentFuelLevel) ?? 100,
      temperature: Number(temperature) || 65,
      utilization: Number(utilization) || 0,
      assignedOperator: assignedOperator || 'Unassigned',
      lastMaintenanceDate: lastMaintenanceDate || new Date().toISOString(),
      nextMaintenanceDate: nextMaintenanceDate || new Date(Date.now() + 30 * 86400000).toISOString(),
      healthStatus: healthStatus || 'Good',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryFleet.unshift(memoryItem);

    res.status(201).json({
      success: true,
      message: 'Mining equipment registered successfully (InMemory).',
      data: memoryItem,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to create equipment record.',
      error: error.message,
    });
  }
};

// @desc    Update existing equipment
// @route   PUT /api/equipment/:id
// @access  Private (Admin Role Only)
export const updateEquipment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (mongoose.connection.readyState === 1) {
      const updated = await Equipment.findOneAndUpdate(
        { $or: [{ equipmentId: id.toUpperCase() }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])] },
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: `Equipment with ID '${id}' not found for update.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Equipment updated successfully in MongoDB.',
        data: updated,
      });
      return;
    }

    const idx = memoryFleet.findIndex(
      (eq) => eq.equipmentId.toUpperCase() === id.toUpperCase() || eq._id === id
    );

    if (idx === -1) {
      res.status(404).json({
        success: false,
        message: `Equipment with ID '${id}' not found.`,
      });
      return;
    }

    memoryFleet[idx] = {
      ...memoryFleet[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      message: 'Equipment updated successfully.',
      data: memoryFleet[idx],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to update equipment.',
      error: error.message,
    });
  }
};

// @desc    Delete equipment
// @route   DELETE /api/equipment/:id
// @access  Private (Admin Role Only)
export const deleteEquipment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const deleted = await Equipment.findOneAndDelete({
        $or: [{ equipmentId: id.toUpperCase() }, ...(mongoose.isValidObjectId(id) ? [{ _id: id }] : [])],
      });

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: `Equipment '${id}' not found for deletion.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Equipment '${deleted.equipmentId}' has been deleted.`,
        data: deleted,
      });
      return;
    }

    const idx = memoryFleet.findIndex(
      (eq) => eq.equipmentId.toUpperCase() === id.toUpperCase() || eq._id === id
    );

    if (idx === -1) {
      res.status(404).json({
        success: false,
        message: `Equipment '${id}' not found for deletion.`,
      });
      return;
    }

    const removed = memoryFleet.splice(idx, 1)[0];

    res.status(200).json({
      success: true,
      message: `Equipment '${removed.equipmentId}' deleted successfully.`,
      data: removed,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete equipment.',
      error: error.message,
    });
  }
};

// ==========================================
// TACTICAL FLEET LOCATION & MAP CONTROLLER
// ==========================================

export interface MineZoneDefinition {
  id: string;
  name: string;
  code: string;
  type: 'pit' | 'crusher' | 'haulroad' | 'workshop' | 'dump' | 'staging';
  polygonCoordinates: { x: number; y: number }[];
  color: string;
  speedLimitKmh: number;
}

export const MINE_SITE_ZONES: MineZoneDefinition[] = [
  {
    id: 'zone-north-pit',
    name: 'North Pit Deep Benches',
    code: 'NP-B4',
    type: 'pit',
    polygonCoordinates: [{ x: 18, y: 15 }, { x: 42, y: 15 }, { x: 45, y: 45 }, { x: 15, y: 40 }],
    color: '#3b82f6',
    speedLimitKmh: 25,
  },
  {
    id: 'zone-south-pit',
    name: 'South Pit Excavation Sector',
    code: 'SP-SEC-B',
    type: 'pit',
    polygonCoordinates: [{ x: 30, y: 55 }, { x: 55, y: 55 }, { x: 52, y: 88 }, { x: 25, y: 85 }],
    color: '#0284c7',
    speedLimitKmh: 25,
  },
  {
    id: 'zone-crusher',
    name: 'Primary Crusher & ROM Stockpiles',
    code: 'CRUSH-01',
    type: 'crusher',
    polygonCoordinates: [{ x: 68, y: 22 }, { x: 92, y: 22 }, { x: 92, y: 46 }, { x: 68, y: 46 }],
    color: '#eab308',
    speedLimitKmh: 20,
  },
  {
    id: 'zone-haul-a',
    name: 'Main Haul Ramp Alpha (10% Decline)',
    code: 'RAMP-A',
    type: 'haulroad',
    polygonCoordinates: [{ x: 45, y: 35 }, { x: 68, y: 38 }, { x: 68, y: 50 }, { x: 45, y: 48 }],
    color: '#10b981',
    speedLimitKmh: 40,
  },
  {
    id: 'zone-workshop',
    name: 'Heavy Mobile Equipment Workshop',
    code: 'BAY-1-4',
    type: 'workshop',
    polygonCoordinates: [{ x: 74, y: 58 }, { x: 95, y: 58 }, { x: 95, y: 88 }, { x: 74, y: 88 }],
    color: '#8b5cf6',
    speedLimitKmh: 15,
  },
  {
    id: 'zone-west-dump',
    name: 'West Overburden Waste Dump',
    code: 'W-DUMP-2',
    type: 'dump',
    polygonCoordinates: [{ x: 5, y: 48 }, { x: 22, y: 48 }, { x: 22, y: 82 }, { x: 5, y: 82 }],
    color: '#f97316',
    speedLimitKmh: 30,
  },
  {
    id: 'zone-staging',
    name: 'Central Dispatch & Refuel Staging Pad',
    code: 'STAGE-01',
    type: 'staging',
    polygonCoordinates: [{ x: 45, y: 48 }, { x: 62, y: 48 }, { x: 62, y: 65 }, { x: 45, y: 65 }],
    color: '#64748b',
    speedLimitKmh: 20,
  },
];

// Map location string in project to coordinates on tactical grid
function resolveCoordinatesForLocation(loc: string, index: number): { x: number; y: number; zone: string; elevation: string } {
  const l = loc.toLowerCase();
  if (l.includes('north pit')) {
    return { x: 28 + (index % 3) * 4, y: 28 + (index % 2) * 4, zone: 'North Pit Deep Benches', elevation: '-140m RL' };
  }
  if (l.includes('south pit')) {
    return { x: 38 + (index % 3) * 4, y: 70 + (index % 2) * 5, zone: 'South Pit Excavation Sector', elevation: '-220m RL' };
  }
  if (l.includes('crusher')) {
    return { x: 80 + (index % 2) * 4, y: 34 + (index % 2) * 4, zone: 'Primary Crusher & ROM Stockpiles', elevation: '+80m Surface' };
  }
  if (l.includes('haul road') || l.includes('ramp')) {
    return { x: 58 + (index % 3) * 3, y: 42 + (index % 2) * 3, zone: 'Main Haul Ramp Alpha', elevation: '+25m Gradient' };
  }
  if (l.includes('workshop')) {
    return { x: 84 + (index % 2) * 3, y: 72 + (index % 3) * 3, zone: 'Heavy Mobile Equipment Workshop', elevation: '0m Surface Depot' };
  }
  if (l.includes('waste') || l.includes('dump')) {
    return { x: 14 + (index % 2) * 3, y: 64 + (index % 2) * 4, zone: 'West Overburden Waste Dump', elevation: '+60m Crest' };
  }
  if (l.includes('staging')) {
    return { x: 52 + (index % 2) * 3, y: 55 + (index % 2) * 3, zone: 'Central Dispatch & Refuel Staging Pad', elevation: '0m Surface Pad' };
  }

  // Deterministic fallback inside pit perimeter
  return {
    x: 35 + ((index * 7) % 30),
    y: 40 + ((index * 11) % 30),
    zone: 'Active Mining Works - Sector Core',
    elevation: '-80m RL',
  };
}

// @desc    Get tactical GPS & location tracking coordinates for all fleet equipment
// @route   GET /api/equipment/map/locations
// @access  Public
export const getEquipmentMapLocations = async (req: Request, res: Response) => {
  try {
    const fleet = inMemoryEquipmentStore;

    const mapData = fleet.map((e, idx) => {
      const geo = resolveCoordinatesForLocation(e.location, idx);
      const isRunning = e.status === 'Running';
      const isDumpTruck = e.type === 'Dump Truck';

      // Speed simulation based on machine type and status
      let speedKmh = 0;
      if (isRunning) {
        speedKmh = isDumpTruck ? 28 + (idx % 6) : 4 + (idx % 3);
      } else if (e.status === 'Idle') {
        speedKmh = 0;
      }

      // Heading orientation (0-360 degrees)
      const headingDeg = (idx * 65 + 40) % 360;

      return {
        equipmentId: e.equipmentId,
        name: e.name,
        type: e.type,
        model: e.model,
        manufacturer: e.manufacturer,
        status: e.status,
        healthStatus: e.healthStatus,
        locationName: e.location,
        zoneName: geo.zone,
        elevation: geo.elevation,
        coordinates: {
          x: geo.x,
          y: geo.y,
        },
        speedKmh,
        headingDeg,
        assignedOperator: e.assignedOperator || 'Unassigned',
        fuelLevel: e.currentFuelLevel,
        temperature: e.temperature,
        engineHours: e.engineHours,
        utilization: e.utilization,
        signalStrength: 94 + (idx % 6),
        telemetryNetwork: '900MHz Private Industrial LTE / Mesh',
        lastTelemetryPing: new Date(Date.now() - (idx * 2 + 1) * 1000).toISOString(),
      };
    });

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      siteName: 'IronRidge Open-Pit Iron Ore Mine - Sector 4',
      mineSiteDimensionsMeters: {
        width: 3200,
        height: 2400,
        datum: 'WGS84 UTM Zone 50S',
      },
      zones: MINE_SITE_ZONES,
      fleetCount: mapData.length,
      activeOnMapCount: mapData.filter((m) => m.status === 'Running' || m.status === 'Idle').length,
      equipment: mapData,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
