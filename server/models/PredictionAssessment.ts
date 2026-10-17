import mongoose, { Schema } from 'mongoose';

export type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface IPredictionAssessment {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  healthScore: number; // 0 to 100
  healthGrade: HealthGrade;
  failureProbability: number; // 0 to 100%
  remainingUsefulLifeDays: number; // estimated days to critical failure
  riskLevel: RiskLevel;
  primaryRiskFactor: string;
  recommendations: string[];
  anomalousSensors: string[];
  aiAnalysisSummary: string;
  componentBreakdown: {
    engine: number; // 0 - 100
    hydraulics: number;
    transmission: number;
    coolingSystem: number;
    electrical: number;
  };
  sensorTelemetrySnapshot: {
    temperature: number;
    engineRpm: number;
    oilPressure: number;
    vibration: number;
    engineLoad: number;
    fuelConsumptionRate: number;
  };
  assessedAt: Date;
  source: 'gemini-ai' | 'deterministic-rule-engine';
  createdAt?: Date;
}

const PredictionAssessmentSchema = new Schema<IPredictionAssessment>(
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
    healthScore: { type: Number, required: true, min: 0, max: 100 },
    healthGrade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'], required: true },
    failureProbability: { type: Number, required: true, min: 0, max: 100 },
    remainingUsefulLifeDays: { type: Number, required: true, min: 0 },
    riskLevel: {
      type: String,
      enum: ['Low', 'Moderate', 'High', 'Critical'],
      required: true,
    },
    primaryRiskFactor: { type: String, required: true },
    recommendations: { type: [String], default: [] },
    anomalousSensors: { type: [String], default: [] },
    aiAnalysisSummary: { type: String, required: true },
    componentBreakdown: {
      engine: { type: Number, default: 85 },
      hydraulics: { type: Number, default: 85 },
      transmission: { type: Number, default: 85 },
      coolingSystem: { type: Number, default: 85 },
      electrical: { type: Number, default: 85 },
    },
    sensorTelemetrySnapshot: {
      temperature: { type: Number },
      engineRpm: { type: Number },
      oilPressure: { type: Number },
      vibration: { type: Number },
      engineLoad: { type: Number },
      fuelConsumptionRate: { type: Number },
    },
    assessedAt: { type: Date, default: () => new Date() },
    source: {
      type: String,
      enum: ['gemini-ai', 'deterministic-rule-engine'],
      default: 'gemini-ai',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

PredictionAssessmentSchema.index({ equipmentId: 1, assessedAt: -1 });

export const PredictionAssessment = mongoose.model<IPredictionAssessment>(
  'PredictionAssessment',
  PredictionAssessmentSchema
);
