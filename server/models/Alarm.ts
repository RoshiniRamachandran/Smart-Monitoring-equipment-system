import mongoose, { Schema } from 'mongoose';

export type AlarmSeverity = 'Critical' | 'Warning' | 'Caution' | 'Info';
export type AlarmCategory = 'Engine' | 'Hydraulics' | 'Transmission' | 'Safety' | 'Fire Suppression' | 'Electrical';
export type AlarmStatus = 'Active' | 'Acknowledged' | 'Resolved' | 'Suppressed';

export interface IAlarm {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  alarmCode: string;
  severity: AlarmSeverity;
  category: AlarmCategory;
  title: string;
  description: string;
  triggerValue?: string;
  threshold?: string;
  status: AlarmStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;
  audioSirenTriggered: boolean;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const AlarmSchema = new Schema<IAlarm>(
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
    alarmCode: { type: String, required: true, uppercase: true },
    severity: {
      type: String,
      enum: ['Critical', 'Warning', 'Caution', 'Info'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['Engine', 'Hydraulics', 'Transmission', 'Safety', 'Fire Suppression', 'Electrical'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    triggerValue: { type: String },
    threshold: { type: String },
    status: {
      type: String,
      enum: ['Active', 'Acknowledged', 'Resolved', 'Suppressed'],
      default: 'Active',
      index: true,
    },
    acknowledgedBy: { type: String },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    resolutionNotes: { type: String },
    audioSirenTriggered: { type: Boolean, default: false },
    timestamp: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
  }
);

AlarmSchema.index({ equipmentId: 1, status: 1, severity: 1 });

export const Alarm = mongoose.model<IAlarm>('Alarm', AlarmSchema);
