import mongoose, { Schema } from 'mongoose';

export interface ITelemetry {
  equipmentId: string;
  timestamp: Date;
  engineRpm: number; // RPM (e.g., 600 - 2200)
  temperature: number; // Coolant temp °C (e.g., 60 - 110)
  oilPressure: number; // PSI (e.g., 20 - 75)
  vibration: number; // mm/s RMS (e.g., 0.5 - 12.0)
  fuelLevel: number; // % (0 - 100)
  fuelConsumptionRate: number; // Litres/hour (e.g., 15 - 95 L/h)
  hydraulicPressure: number; // Bar (e.g., 150 - 350 bar)
  batteryVoltage: number; // Volts (e.g., 23.5 - 28.5V)
  engineLoad: number; // % (0 - 100)
  operationalStatus: 'Running' | 'Idle' | 'Maintenance' | 'Breakdown' | 'Offline';
  anomalyDetected: boolean;
  anomalyReason?: string;
  createdAt?: Date;
}

const TelemetrySchema = new Schema<ITelemetry>(
  {
    equipmentId: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
    engineRpm: { type: Number, required: true },
    temperature: { type: Number, required: true },
    oilPressure: { type: Number, required: true },
    vibration: { type: Number, required: true },
    fuelLevel: { type: Number, required: true },
    fuelConsumptionRate: { type: Number, required: true },
    hydraulicPressure: { type: Number, required: true },
    batteryVoltage: { type: Number, required: true },
    engineLoad: { type: Number, required: true },
    operationalStatus: {
      type: String,
      enum: ['Running', 'Idle', 'Maintenance', 'Breakdown', 'Offline'],
      default: 'Running',
    },
    anomalyDetected: { type: Boolean, default: false },
    anomalyReason: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Time-series query optimization
TelemetrySchema.index({ equipmentId: 1, timestamp: -1 });

export const Telemetry = mongoose.model<ITelemetry>('Telemetry', TelemetrySchema);
