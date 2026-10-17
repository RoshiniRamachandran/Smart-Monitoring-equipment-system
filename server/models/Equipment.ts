import mongoose, { Schema, Document } from 'mongoose';

export type EquipmentType =
  | 'Excavator'
  | 'Dump Truck'
  | 'Loader'
  | 'Drilling Machine'
  | 'Bulldozer'
  | 'Haul Truck';

export type EquipmentStatus =
  | 'Running'
  | 'Idle'
  | 'Maintenance'
  | 'Breakdown'
  | 'Offline';

export type EquipmentHealthStatus = 'Good' | 'Warning' | 'Critical';

export interface IEquipment {
  equipmentId: string;
  name: string;
  type: EquipmentType;
  model: string;
  manufacturer: string;
  year: number;
  status: EquipmentStatus;
  location: string;
  engineHours: number;
  fuelCapacity: number; // in Litres
  currentFuelLevel: number; // in Percentage (0 - 100%)
  temperature: number; // in Celsius (°C)
  utilization: number; // in Percentage (0 - 100%)
  assignedOperator: string;
  lastMaintenanceDate: Date;
  nextMaintenanceDate: Date;
  healthStatus: EquipmentHealthStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

const EquipmentSchema = new Schema<IEquipment>(
  {
    equipmentId: {
      type: String,
      required: [true, 'Equipment ID is required (e.g. EXC-001)'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Equipment name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Equipment type is required'],
      enum: [
        'Excavator',
        'Dump Truck',
        'Loader',
        'Drilling Machine',
        'Bulldozer',
        'Haul Truck',
      ],
    },
    model: {
      type: String,
      required: [true, 'Equipment model is required'],
      trim: true,
    },
    manufacturer: {
      type: String,
      required: [true, 'Manufacturer is required (e.g. Caterpillar, Komatsu)'],
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1990,
      max: new Date().getFullYear() + 1,
    },
    status: {
      type: String,
      enum: ['Running', 'Idle', 'Maintenance', 'Breakdown', 'Offline'],
      default: 'Idle',
      required: true,
    },
    location: {
      type: String,
      required: [true, 'Site location / Pit zone is required'],
      trim: true,
    },
    engineHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    fuelCapacity: {
      type: Number,
      required: [true, 'Fuel capacity in Litres is required'],
      min: 50,
    },
    currentFuelLevel: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    temperature: {
      type: Number,
      default: 65,
    },
    utilization: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    assignedOperator: {
      type: String,
      default: 'Unassigned',
      trim: true,
    },
    lastMaintenanceDate: {
      type: Date,
      default: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    nextMaintenanceDate: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    healthStatus: {
      type: String,
      enum: ['Good', 'Warning', 'Critical'],
      default: 'Good',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast searching and filtering
EquipmentSchema.index({ equipmentId: 1, type: 1, status: 1 });

export const Equipment = mongoose.model<IEquipment>('Equipment', EquipmentSchema);
