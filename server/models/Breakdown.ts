import mongoose, { Schema } from 'mongoose';

export type BreakdownSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type BreakdownStatus = 'Reported' | 'Assessed' | 'Repairing' | 'Resolved';

export interface IBreakdown {
  breakdownId: string;
  equipmentId: string;
  equipmentName: string;
  reportedBy: string; // User name or email
  reportedAt: Date;
  severity: BreakdownSeverity;
  status: BreakdownStatus;
  faultCategory: string; // e.g. Engine, Hydraulic, Electrical, Transmission, Structural
  location: string;
  symptoms: string;
  rootCause?: string;
  resolutionNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  estimatedCost?: number;
  downtimeHours?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const BreakdownSchema = new Schema<IBreakdown>(
  {
    breakdownId: {
      type: String,
      required: [true, 'Breakdown incident ID is required (e.g. BRK-501)'],
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
      required: [true, 'Equipment name is required'],
      trim: true,
    },
    reportedBy: {
      type: String,
      required: [true, 'Reporter identity is required'],
      trim: true,
    },
    reportedAt: {
      type: Date,
      default: () => new Date(),
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'High',
      required: true,
    },
    status: {
      type: String,
      enum: ['Reported', 'Assessed', 'Repairing', 'Resolved'],
      default: 'Reported',
      required: true,
    },
    faultCategory: {
      type: String,
      required: [true, 'Fault category is required'],
      enum: ['Engine', 'Hydraulic', 'Electrical', 'Transmission', 'Braking System', 'Structural', 'Cooling System'],
      default: 'Engine',
    },
    location: {
      type: String,
      required: [true, 'Incident location is required'],
      trim: true,
    },
    symptoms: {
      type: String,
      required: [true, 'Fault symptoms description is required'],
      trim: true,
    },
    rootCause: {
      type: String,
      trim: true,
    },
    resolutionNotes: {
      type: String,
      trim: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: String,
      trim: true,
    },
    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    downtimeHours: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

BreakdownSchema.index({ breakdownId: 1, equipmentId: 1, status: 1, severity: 1 });

export const Breakdown = mongoose.model<IBreakdown>('Breakdown', BreakdownSchema);
