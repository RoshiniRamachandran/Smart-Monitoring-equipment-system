import mongoose, { Schema } from 'mongoose';

export type ShiftType = 'Day Shift (06:00 - 18:00)' | 'Night Shift (18:00 - 06:00)';
export type InspectionResult = 'Passed' | 'Passed with Minor Defects' | 'Failed - Out of Service';

export interface IInspectionItem {
  category: 'Fluid Levels' | 'Safety Systems' | 'Engine & Electrical' | 'Undercarriage / Tyres' | 'Controls & Hydraulics';
  itemName: string;
  status: 'Pass' | 'Fail' | 'N/A';
  notes?: string;
}

export interface IShiftHandover {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  shift: ShiftType;
  date: Date;
  outgoingOperatorName: string;
  outgoingOperatorId?: string;
  incomingOperatorName: string;
  incomingOperatorId?: string;
  startingEngineHours: number;
  endingEngineHours: number;
  startingFuelLevel: number; // %
  endingFuelLevel: number; // %
  inspectionResult: InspectionResult;
  inspectionChecklist: IInspectionItem[];
  criticalDefectsNoted?: string;
  operationalNotes?: string;
  safetyInterlockTested: boolean;
  fireSuppressionInspected: boolean;
  status: 'Completed' | 'Pending Review' | 'Flagged for Workshop';
  createdAt?: Date;
  updatedAt?: Date;
}

const InspectionItemSchema = new Schema<IInspectionItem>(
  {
    category: {
      type: String,
      enum: [
        'Fluid Levels',
        'Safety Systems',
        'Engine & Electrical',
        'Undercarriage / Tyres',
        'Controls & Hydraulics',
      ],
      required: true,
    },
    itemName: { type: String, required: true },
    status: { type: String, enum: ['Pass', 'Fail', 'N/A'], default: 'Pass' },
    notes: { type: String },
  },
  { _id: false }
);

const ShiftHandoverSchema = new Schema<IShiftHandover>(
  {
    equipmentId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    equipmentName: { type: String, required: true },
    equipmentType: { type: String, required: true },
    shift: {
      type: String,
      enum: ['Day Shift (06:00 - 18:00)', 'Night Shift (18:00 - 06:00)'],
      required: true,
    },
    date: { type: Date, default: () => new Date() },
    outgoingOperatorName: { type: String, required: true },
    outgoingOperatorId: { type: String },
    incomingOperatorName: { type: String, required: true },
    incomingOperatorId: { type: String },
    startingEngineHours: { type: Number, required: true },
    endingEngineHours: { type: Number, required: true },
    startingFuelLevel: { type: Number, required: true },
    endingFuelLevel: { type: Number, required: true },
    inspectionResult: {
      type: String,
      enum: ['Passed', 'Passed with Minor Defects', 'Failed - Out of Service'],
      default: 'Passed',
    },
    inspectionChecklist: { type: [InspectionItemSchema], default: [] },
    criticalDefectsNoted: { type: String },
    operationalNotes: { type: String },
    safetyInterlockTested: { type: Boolean, default: true },
    fireSuppressionInspected: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['Completed', 'Pending Review', 'Flagged for Workshop'],
      default: 'Completed',
    },
  },
  {
    timestamps: true,
  }
);

ShiftHandoverSchema.index({ equipmentId: 1, date: -1 });

export const ShiftHandover = mongoose.model<IShiftHandover>(
  'ShiftHandover',
  ShiftHandoverSchema
);
