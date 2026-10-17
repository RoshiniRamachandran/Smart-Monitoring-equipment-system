import mongoose, { Schema } from 'mongoose';

export type MaintenanceType =
  | 'Preventive'
  | 'Corrective'
  | 'Inspection'
  | 'Overhaul'
  | 'Emergency';

export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type MaintenanceStatus =
  | 'Scheduled'
  | 'In-Progress'
  | 'Completed'
  | 'Cancelled';

export interface IMaintenance {
  maintenanceId: string;
  equipmentId: string;
  equipmentName: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  scheduledDate: Date;
  completionDate?: Date;
  assignedTechnician: string;
  description: string;
  actionTaken?: string;
  cost: number; // in USD
  downtimeHours: number;
  partsReplaced?: string[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const MaintenanceSchema = new Schema<IMaintenance>(
  {
    maintenanceId: {
      type: String,
      required: [true, 'Maintenance ID is required (e.g. MNT-101)'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    equipmentId: {
      type: String,
      required: [true, 'Equipment ID is required'],
      trim: true,
      uppercase: true,
    },
    equipmentName: {
      type: String,
      required: [true, 'Equipment Name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['Preventive', 'Corrective', 'Inspection', 'Overhaul', 'Emergency'],
      default: 'Preventive',
      required: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
      required: true,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'In-Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled',
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
      default: () => new Date(),
    },
    completionDate: {
      type: Date,
    },
    assignedTechnician: {
      type: String,
      required: [true, 'Assigned technician name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Maintenance description is required'],
      trim: true,
    },
    actionTaken: {
      type: String,
      trim: true,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    downtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    partsReplaced: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

MaintenanceSchema.index({ maintenanceId: 1, equipmentId: 1, status: 1 });

export const Maintenance = mongoose.model<IMaintenance>('Maintenance', MaintenanceSchema);
