import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ShiftHandover, IShiftHandover, IInspectionItem } from '../models/ShiftHandover.js';
import { inMemoryEquipmentStore } from '../controllers/equipmentController.js';

// Pre-seeded Handover logs
export let inMemoryHandoverStore: (IShiftHandover & { _id: string })[] = [
  {
    _id: 'SHO-001',
    equipmentId: 'DT-001',
    equipmentName: 'CAT 797F Ultra Haul Dump Truck',
    equipmentType: 'Dump Truck',
    shift: 'Day Shift (06:00 - 18:00)',
    date: new Date('2026-09-14T06:00:00Z'),
    outgoingOperatorName: 'Marcus Vance',
    incomingOperatorName: 'Elena Rostova',
    startingEngineHours: 6420,
    endingEngineHours: 6431,
    startingFuelLevel: 95,
    endingFuelLevel: 42,
    inspectionResult: 'Passed',
    safetyInterlockTested: true,
    fireSuppressionInspected: true,
    status: 'Completed',
    operationalNotes: 'Completed 14 haul cycles from Bench 4 to Primary Crusher. Retarder braking responsive on 10% decline ramp.',
    inspectionChecklist: [
      { category: 'Fluid Levels', itemName: 'Engine Oil Dipstick Check', status: 'Pass' },
      { category: 'Fluid Levels', itemName: 'Hydraulic Reservoir Sight Gauge', status: 'Pass' },
      { category: 'Fluid Levels', itemName: 'Coolant Expansion Tank Level', status: 'Pass' },
      { category: 'Safety Systems', itemName: 'Automatic Fire Suppression Pressure Pin', status: 'Pass' },
      { category: 'Safety Systems', itemName: 'Emergency Cab E-Stop & Park Brake Interlock', status: 'Pass' },
      { category: 'Safety Systems', itemName: 'Reverse Travel Alarm & Strobe Beacons', status: 'Pass' },
      { category: 'Engine & Electrical', itemName: 'Alternator Charge Voltage & Battery Terminals', status: 'Pass' },
      { category: 'Undercarriage / Tyres', itemName: 'Tyre Pressure & Rim Flange Visual Inspection', status: 'Pass' },
      { category: 'Controls & Hydraulics', itemName: 'Hoist Cylinder Hydraulic Hose Integrity', status: 'Pass' },
    ],
  },
  {
    _id: 'SHO-002',
    equipmentId: 'EXC-001',
    equipmentName: 'CAT 390F Heavy Excavator',
    equipmentType: 'Excavator',
    shift: 'Day Shift (06:00 - 18:00)',
    date: new Date('2026-09-14T06:00:00Z'),
    outgoingOperatorName: 'Darius Thorne',
    incomingOperatorName: 'Kenji Sato',
    startingEngineHours: 5810,
    endingEngineHours: 5821,
    startingFuelLevel: 90,
    endingFuelLevel: 48,
    inspectionResult: 'Passed with Minor Defects',
    safetyInterlockTested: true,
    fireSuppressionInspected: true,
    status: 'Pending Review',
    criticalDefectsNoted: 'Right boom cylinder wiper seal showing slight hydraulic oil seepage. Reservoir level remained stable during shift.',
    operationalNotes: 'Excavated 4,200 tons blasted overburden in North Pit sector 2.',
    inspectionChecklist: [
      { category: 'Fluid Levels', itemName: 'Engine Oil Dipstick Check', status: 'Pass' },
      { category: 'Fluid Levels', itemName: 'Hydraulic Reservoir Sight Gauge', status: 'Pass' },
      { category: 'Fluid Levels', itemName: 'Swing Gearbox Oil Level', status: 'Pass' },
      { category: 'Safety Systems', itemName: 'Emergency Stop Pull-Cords', status: 'Pass' },
      { category: 'Undercarriage / Tyres', itemName: 'Track Shoe Tension & Idler Roller Alignment', status: 'Pass' },
      { category: 'Controls & Hydraulics', itemName: 'Boom Cylinder Seal Packing', status: 'Fail', notes: 'Slight seepage on right cylinder gland.' },
      { category: 'Controls & Hydraulics', itemName: 'Bucket Teeth Retainer Pins & Wear Plate', status: 'Pass' },
    ],
  },
  {
    _id: 'SHO-003',
    equipmentId: 'BD-001',
    equipmentName: 'CAT D11T Track Bulldozer',
    equipmentType: 'Bulldozer',
    shift: 'Night Shift (18:00 - 06:00)',
    date: new Date('2026-09-13T18:00:00Z'),
    outgoingOperatorName: 'Liam Gallagher',
    incomingOperatorName: 'Tomasz Nowak',
    startingEngineHours: 9240,
    endingEngineHours: 9244,
    startingFuelLevel: 80,
    endingFuelLevel: 65,
    inspectionResult: 'Failed - Out of Service',
    safetyInterlockTested: false,
    fireSuppressionInspected: true,
    status: 'Flagged for Workshop',
    criticalDefectsNoted: 'Severe transmission slippage in reverse gear 2. Machine immobilized and isolated with lock-out tag-out.',
    operationalNotes: 'Ripping caprock on Waste Dump 3 when reverse planetary gear shuddered. Machine parked in safe refuge zone.',
    inspectionChecklist: [
      { category: 'Fluid Levels', itemName: 'Transmission Sump Dipstick', status: 'Fail', notes: 'Low fluid and metal particulate sheen on dipstick.' },
      { category: 'Safety Systems', itemName: 'Emergency Steering & Brake Accumulator', status: 'Fail', notes: 'Intermittent pressure warning light.' },
      { category: 'Engine & Electrical', itemName: 'Engine Belts & Turbocharger Guarding', status: 'Pass' },
      { category: 'Undercarriage / Tyres', itemName: 'Sprocket Segment Wear & Track Sag', status: 'Pass' },
    ],
  },
];

// @desc    Get list of shift handovers and pre-start inspection logs
// @route   GET /api/handovers
// @access  Public
export const getShiftHandovers = async (req: Request, res: Response) => {
  try {
    const { equipmentId, status, inspectionResult } = req.query;
    let filtered = [...inMemoryHandoverStore];

    if (equipmentId) {
      filtered = filtered.filter(
        (h) => h.equipmentId.toUpperCase() === String(equipmentId).toUpperCase()
      );
    }
    if (status) {
      filtered = filtered.filter((h) => h.status === status);
    }
    if (inspectionResult) {
      filtered = filtered.filter((h) => h.inspectionResult === inspectionResult);
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single handover log by ID
// @route   GET /api/handovers/:id
// @access  Public
export const getShiftHandoverById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const handover = inMemoryHandoverStore.find((h) => h._id === id);

    if (!handover) {
      return res.status(404).json({ success: false, message: 'Handover log not found' });
    }

    res.json({
      success: true,
      data: handover,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new shift handover & pre-start checklist log
// @route   POST /api/handovers
// @access  Public / Authenticated
export const createShiftHandover = async (req: Request, res: Response) => {
  try {
    const {
      equipmentId,
      shift,
      outgoingOperatorName,
      incomingOperatorName,
      startingEngineHours,
      endingEngineHours,
      startingFuelLevel,
      endingFuelLevel,
      inspectionResult,
      inspectionChecklist,
      criticalDefectsNoted,
      operationalNotes,
      safetyInterlockTested,
      fireSuppressionInspected,
    } = req.body;

    if (!equipmentId || !shift || !outgoingOperatorName || !incomingOperatorName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide equipmentId, shift, outgoingOperatorName, and incomingOperatorName',
      });
    }

    const eq = inMemoryEquipmentStore.find(
      (e) => e.equipmentId.toUpperCase() === equipmentId.toUpperCase()
    );

    const newHandover: IShiftHandover & { _id: string } = {
      _id: `SHO-${String(inMemoryHandoverStore.length + 1).padStart(3, '0')}`,
      equipmentId: equipmentId.toUpperCase(),
      equipmentName: eq ? eq.name : `Machine ${equipmentId}`,
      equipmentType: eq ? eq.type : 'Mining Equipment',
      shift: shift || 'Day Shift (06:00 - 18:00)',
      date: new Date(),
      outgoingOperatorName,
      incomingOperatorName,
      startingEngineHours: Number(startingEngineHours) || 0,
      endingEngineHours: Number(endingEngineHours) || Number(startingEngineHours) || 0,
      startingFuelLevel: Number(startingFuelLevel) || 100,
      endingFuelLevel: Number(endingFuelLevel) || 75,
      inspectionResult: inspectionResult || 'Passed',
      inspectionChecklist: inspectionChecklist || [],
      criticalDefectsNoted: criticalDefectsNoted || '',
      operationalNotes: operationalNotes || '',
      safetyInterlockTested: safetyInterlockTested ?? true,
      fireSuppressionInspected: fireSuppressionInspected ?? true,
      status: inspectionResult === 'Failed - Out of Service'
        ? 'Flagged for Workshop'
        : inspectionResult === 'Passed with Minor Defects'
        ? 'Pending Review'
        : 'Completed',
    };

    inMemoryHandoverStore.unshift(newHandover);

    // If inspection failed, update machine status in fleet registry to Breakdown or Maintenance
    if (eq && inspectionResult === 'Failed - Out of Service') {
      eq.status = 'Breakdown';
    }

    if (mongoose.connection.readyState === 1) {
      try {
        await ShiftHandover.create(newHandover);
      } catch {
        // MongoDB offline fallback
      }
    }

    res.status(201).json({
      success: true,
      message: 'Shift handover & pre-start inspection logged successfully',
      data: newHandover,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
