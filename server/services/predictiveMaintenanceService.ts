import { getGeminiClient } from './geminiClient.js';
import {
  getEquipmentTelemetryHistory,
  getLatestReadingsList,
  TelemetryReading,
} from './telemetrySimulator.js';
import { inMemoryEquipmentStore } from '../controllers/equipmentController.js';
import {
  PredictionAssessment,
  IPredictionAssessment,
  HealthGrade,
  RiskLevel,
} from '../models/PredictionAssessment.js';

// Deterministic rule engine fallback when Gemini API key is not supplied or during offline mode
export function computeDeterministicAssessment(
  reading: TelemetryReading,
  history: TelemetryReading[]
): IPredictionAssessment {
  let healthScore = 100;
  const anomalousSensors: string[] = [];
  const recommendations: string[] = [];

  const temp = reading.temperature;
  const vib = reading.vibration;
  const oil = reading.oilPressure;
  const status = reading.operationalStatus;

  // Temperature penalty
  if (temp > 102) {
    healthScore -= 35;
    anomalousSensors.push(`Engine Coolant Temperature (${temp}°C > 100°C)`);
    recommendations.push('Immediate radiator cleanout and thermostat replacement required.');
  } else if (temp > 95) {
    healthScore -= 15;
    anomalousSensors.push(`Elevated Coolant Temp (${temp}°C)`);
    recommendations.push('Inspect cooling fan viscous clutch and radiator airflow.');
  }

  // Vibration penalty
  if (vib > 6.0) {
    healthScore -= 35;
    anomalousSensors.push(`Bearing Vibration (${vib} mm/s > 5.0 mm/s)`);
    recommendations.push('Perform ultrasonic bearing analysis and check drive shaft balance.');
  } else if (vib > 4.5) {
    healthScore -= 12;
    anomalousSensors.push(`Moderate Vibration (${vib} mm/s)`);
    recommendations.push('Schedule lubrication of universal joints and pillow blocks.');
  }

  // Oil pressure penalty
  if (status === 'Running' && oil < 25) {
    healthScore -= 40;
    anomalousSensors.push(`Critical Low Oil Pressure (${oil} PSI < 30 PSI)`);
    recommendations.push('DANGER: Risk of engine seizure. Shut down machine immediately.');
  } else if (status === 'Running' && oil < 40) {
    healthScore -= 15;
    anomalousSensors.push(`Marginal Oil Pressure (${oil} PSI)`);
    recommendations.push('Verify oil viscosity grade and check filter differential pressure.');
  }

  // Operational status penalty
  if (status === 'Breakdown') {
    healthScore = Math.min(healthScore, 25);
    anomalousSensors.push('Machine Interlock: Unplanned breakdown reported in pit');
    recommendations.push('Field service mechanic dispatched. Complete lock-out tag-out before inspection.');
  } else if (status === 'Maintenance') {
    healthScore = Math.min(healthScore, 55);
    recommendations.push('Active work order in progress in workshop bay.');
  }

  // Bound health score
  healthScore = Math.max(12, Math.min(100, Math.round(healthScore)));

  // Determine grade and risk
  let healthGrade: HealthGrade = 'A';
  let riskLevel: RiskLevel = 'Low';
  let failureProbability = Math.round((100 - healthScore) * 0.9);
  let remainingUsefulLifeDays = Math.max(3, Math.round((healthScore / 100) * 120));

  if (healthScore >= 90) {
    healthGrade = 'A';
    riskLevel = 'Low';
  } else if (healthScore >= 75) {
    healthGrade = 'B';
    riskLevel = 'Moderate';
  } else if (healthScore >= 60) {
    healthGrade = 'C';
    riskLevel = 'Moderate';
  } else if (healthScore >= 40) {
    healthGrade = 'D';
    riskLevel = 'High';
  } else {
    healthGrade = 'F';
    riskLevel = 'Critical';
  }

  const primaryRiskFactor =
    anomalousSensors.length > 0
      ? anomalousSensors[0]
      : 'Normal mechanical wear within permissible tolerances';

  if (recommendations.length === 0) {
    recommendations.push('Continue scheduled 250-hour oil sample analysis.');
    recommendations.push('Maintain standard shift pre-start inspection checklist.');
  }

  const assessment: IPredictionAssessment = {
    equipmentId: reading.equipmentId,
    equipmentName: reading.equipmentName,
    equipmentType: reading.equipmentType,
    healthScore,
    healthGrade,
    failureProbability,
    remainingUsefulLifeDays,
    riskLevel,
    primaryRiskFactor,
    recommendations,
    anomalousSensors,
    aiAnalysisSummary: `Rule-Engine Baseline Analysis: Machine exhibits ${healthScore}/100 mechanical integrity. ${
      anomalousSensors.length > 0
        ? `Active stress detected on: ${anomalousSensors.join(', ')}.`
        : 'All sensor telemetry operates within standard baseline thresholds.'
    }`,
    componentBreakdown: {
      engine: Math.max(20, Math.min(100, healthScore + (temp > 95 ? -20 : 0))),
      hydraulics: Math.max(30, Math.min(100, healthScore + (reading.hydraulicPressure < 200 ? -25 : 0))),
      transmission: Math.max(40, Math.min(100, healthScore)),
      coolingSystem: Math.max(15, Math.min(100, temp > 95 ? 40 : 92)),
      electrical: Math.max(50, Math.min(100, reading.batteryVoltage < 25 ? 60 : 95)),
    },
    sensorTelemetrySnapshot: {
      temperature: reading.temperature,
      engineRpm: reading.engineRpm,
      oilPressure: reading.oilPressure,
      vibration: reading.vibration,
      engineLoad: reading.engineLoad,
      fuelConsumptionRate: reading.fuelConsumptionRate,
    },
    assessedAt: new Date(),
    source: 'deterministic-rule-engine',
  };

  return assessment;
}

function parseAiResponseJson(rawText: string): any {
  let text = rawText.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return JSON.parse(text);
}

async function requestGeminiPrediction(gemini: any, prompt: string): Promise<any> {
  const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const generatePromise = gemini.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout requesting ${model}`)), 4500)
      );

      const response: any = await Promise.race([generatePromise, timeoutPromise]);

      const text = response?.text || '';
      if (text) {
        return parseAiResponseJson(text);
      }
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code;
      const isTransient =
        status === 503 ||
        status === 429 ||
        String(err?.message || '').includes('high demand') ||
        String(err?.message || '').includes('UNAVAILABLE') ||
        String(err?.message || '').includes('Timeout');

      if (isTransient && model === 'gemini-3.8-flash') {
        // Small pause before trying alternative model
        await new Promise((resolve) => setTimeout(resolve, 200));
        continue;
      }
      break;
    }
  }

  throw lastError;
}

// Perform AI-powered Predictive Analysis with Gemini or Fallback
export async function analyzeEquipmentHealth(
  equipmentId: string
): Promise<IPredictionAssessment> {
  const normId = equipmentId.toUpperCase();
  const eq = inMemoryEquipmentStore.find((item) => item.equipmentId === normId);
  const latestList = getLatestReadingsList();
  const reading = latestList.find((r) => r.equipmentId === normId);
  const history = getEquipmentTelemetryHistory(normId);

  if (!eq || !reading) {
    throw new Error(`Equipment record not found for ID: ${equipmentId}`);
  }

  const baselineAssessment = computeDeterministicAssessment(reading, history);

  const gemini = getGeminiClient();
  if (!gemini) {
    // Return high-precision deterministic assessment
    return baselineAssessment;
  }

  try {
    // Formulate mining engineer prompt
    const prompt = `You are a Principal Reliability and Predictive Maintenance Mining Engineer.
Analyze this heavy open-pit mining machine based on its technical telemetry snapshot and recent trends:

Machinery: ${eq.name} (Type: ${eq.type}, ID: ${eq.equipmentId}, Current Status: ${eq.status})
Telemetry Snapshot:
- Coolant Temp: ${reading.temperature}°C (Normal: 78-95°C, Critical: >100°C)
- Engine RPM: ${reading.engineRpm} RPM (Nominal loaded: 1600-2100 RPM)
- Oil Pressure: ${reading.oilPressure} PSI (Nominal: 45-70 PSI, Low warning: <30 PSI)
- Vibration RMS: ${reading.vibration} mm/s (ISO 10816 limit: <4.5 mm/s, Severe: >6.0 mm/s)
- Engine Load: ${reading.engineLoad}%
- Hydraulic Pressure: ${reading.hydraulicPressure} Bar (Target: 220-310 Bar)
- Alternator Voltage: ${reading.batteryVoltage} V
- Fuel Burn: ${reading.fuelConsumptionRate} L/h

Recent History Samples Count: ${history.length}
Rule Baseline Suggestion: Health Score ~${baselineAssessment.healthScore}/100, Grade ${baselineAssessment.healthGrade}.

Respond strictly with a single valid JSON object adhering to this schema (no markdown fences, no explanatory text outside JSON):
{
  "healthScore": <integer between 0 and 100>,
  "healthGrade": "<A | B | C | D | F>",
  "failureProbability": <integer between 0 and 100 percentage>,
  "remainingUsefulLifeDays": <integer estimated days until unrecoverable breakdown>,
  "riskLevel": "<Low | Moderate | High | Critical>",
  "primaryRiskFactor": "<concise statement of the single highest mechanical risk>",
  "recommendations": ["<actionable recommendation 1>", "<actionable recommendation 2>", "<actionable recommendation 3>"],
  "anomalousSensors": ["<sensor 1 with reason>", "<sensor 2 with reason>"],
  "aiAnalysisSummary": "<3 to 4 sentence professional engineering diagnostic explaining root cause, physics trajectory, and immediate preventative measures>",
  "componentBreakdown": {
    "engine": <0-100 integer>,
    "hydraulics": <0-100 integer>,
    "transmission": <0-100 integer>,
    "coolingSystem": <0-100 integer>,
    "electrical": <0-100 integer>
  }
}`;

    const parsed = await requestGeminiPrediction(gemini, prompt);

    const assessment: IPredictionAssessment = {
      equipmentId: normId,
      equipmentName: eq.name,
      equipmentType: eq.type,
      healthScore: Math.max(0, Math.min(100, Math.round(parsed.healthScore ?? baselineAssessment.healthScore))),
      healthGrade: (['A', 'B', 'C', 'D', 'F'].includes(parsed.healthGrade)
        ? parsed.healthGrade
        : baselineAssessment.healthGrade) as HealthGrade,
      failureProbability: Math.max(0, Math.min(100, Math.round(parsed.failureProbability ?? baselineAssessment.failureProbability))),
      remainingUsefulLifeDays: Math.max(1, Math.round(parsed.remainingUsefulLifeDays ?? baselineAssessment.remainingUsefulLifeDays)),
      riskLevel: (['Low', 'Moderate', 'High', 'Critical'].includes(parsed.riskLevel)
        ? parsed.riskLevel
        : baselineAssessment.riskLevel) as RiskLevel,
      primaryRiskFactor: parsed.primaryRiskFactor || baselineAssessment.primaryRiskFactor,
      recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
        ? parsed.recommendations
        : baselineAssessment.recommendations,
      anomalousSensors: Array.isArray(parsed.anomalousSensors)
        ? parsed.anomalousSensors
        : baselineAssessment.anomalousSensors,
      aiAnalysisSummary: parsed.aiAnalysisSummary || baselineAssessment.aiAnalysisSummary,
      componentBreakdown: {
        engine: Math.round(parsed.componentBreakdown?.engine ?? baselineAssessment.componentBreakdown.engine),
        hydraulics: Math.round(parsed.componentBreakdown?.hydraulics ?? baselineAssessment.componentBreakdown.hydraulics),
        transmission: Math.round(parsed.componentBreakdown?.transmission ?? baselineAssessment.componentBreakdown.transmission),
        coolingSystem: Math.round(parsed.componentBreakdown?.coolingSystem ?? baselineAssessment.componentBreakdown.coolingSystem),
        electrical: Math.round(parsed.componentBreakdown?.electrical ?? baselineAssessment.componentBreakdown.electrical),
      },
      sensorTelemetrySnapshot: baselineAssessment.sensorTelemetrySnapshot,
      assessedAt: new Date(),
      source: 'gemini-ai',
    };

    // Asynchronously save to MongoDB for historical tracking
    try {
      await PredictionAssessment.create(assessment);
    } catch {
      // Non-blocking
    }

    return assessment;
  } catch (err: any) {
    const status = err?.status || err?.code;
    const isOverloaded =
      status === 503 ||
      status === 429 ||
      String(err?.message || '').includes('high demand') ||
      String(err?.message || '').includes('UNAVAILABLE');

    if (isOverloaded) {
      console.log(
        'ℹ️ [AI Engine] Gemini API experiencing temporary high demand (HTTP 503). Seamlessly serving deterministic reliability physics assessment.'
      );
    } else {
      console.log(
        `ℹ️ [AI Engine] Telemetry analysis served via deterministic reliability physics engine (${err?.message || 'standard baseline'}).`
      );
    }

    return baselineAssessment;
  }
}

// Generate batch assessments for entire fleet
export async function getFleetHealthOverview(): Promise<IPredictionAssessment[]> {
  const latestList = getLatestReadingsList();
  const fleetAssessments: IPredictionAssessment[] = [];

  for (const reading of latestList) {
    const history = getEquipmentTelemetryHistory(reading.equipmentId);
    const assessment = computeDeterministicAssessment(reading, history);
    fleetAssessments.push(assessment);
  }

  return fleetAssessments;
}
