import { inMemoryEquipmentStore } from '../controllers/equipmentController.js';
import { Telemetry, ITelemetry } from '../models/Telemetry.js';

export interface TelemetryReading {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  timestamp: string;
  engineRpm: number;
  temperature: number; // Coolant °C
  oilPressure: number; // PSI
  vibration: number; // mm/s
  fuelLevel: number; // %
  fuelConsumptionRate: number; // L/h
  hydraulicPressure: number; // Bar
  batteryVoltage: number; // V
  engineLoad: number; // %
  operationalStatus: 'Running' | 'Idle' | 'Maintenance' | 'Breakdown' | 'Offline';
  anomalyDetected: boolean;
  anomalyReason?: string;
}

// In-memory ring buffer holding the latest 50 readings per machine
const telemetryHistory = new Map<string, TelemetryReading[]>();
const latestReadings = new Map<string, TelemetryReading>();

// Active SSE client listeners
type SSEListener = (data: TelemetryReading[]) => void;
const sseListeners = new Set<SSEListener>();

// Generator helper with natural physics drift
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function randomDrift(curr: number, min: number, max: number, maxStep: number): number {
  const step = (Math.random() * 2 - 1) * maxStep;
  return Number(clamp(curr + step, min, max).toFixed(1));
}

// Generate an initial or updated telemetry reading for a given machine
export function generateReadingForEquipment(
  eqId: string,
  currentStatus: 'Running' | 'Idle' | 'Maintenance' | 'Breakdown' | 'Offline',
  name: string,
  type: string
): TelemetryReading {
  const prev = latestReadings.get(eqId);

  let engineRpm = 0;
  let temperature = 30;
  let oilPressure = 0;
  let vibration = 0.2;
  let fuelLevel = prev ? Math.max(5, prev.fuelLevel - 0.05) : 75;
  let fuelConsumptionRate = 0;
  let hydraulicPressure = 30;
  let batteryVoltage = 24.2;
  let engineLoad = 0;
  let anomalyDetected = false;
  let anomalyReason: string | undefined = undefined;

  if (currentStatus === 'Running') {
    // Normal working baseline
    engineRpm = prev ? randomDrift(prev.engineRpm, 1400, 2100, 45) : 1750;
    temperature = prev ? randomDrift(prev.temperature, 78, 96, 0.8) : 85.5;
    oilPressure = prev ? randomDrift(prev.oilPressure, 45, 68, 1.2) : 56.0;
    vibration = prev ? randomDrift(prev.vibration, 1.8, 4.8, 0.3) : 2.6;
    fuelConsumptionRate = prev ? randomDrift(prev.fuelConsumptionRate, 35, 78, 1.5) : 52.0;
    hydraulicPressure = prev ? randomDrift(prev.hydraulicPressure, 220, 310, 4.0) : 265.0;
    batteryVoltage = prev ? randomDrift(prev.batteryVoltage, 26.5, 28.2, 0.1) : 27.4;
    engineLoad = prev ? randomDrift(prev.engineLoad, 55, 92, 2.5) : 74;

    // Simulate occasional transient anomalies (1.5% chance) or deliberate machine stress
    if (eqId === 'BD-001' && Math.random() < 0.25) {
      // D11T has known overheating tendency
      temperature = Number((temperature + 8 + Math.random() * 6).toFixed(1));
      if (temperature > 100) {
        anomalyDetected = true;
        anomalyReason = `Critical engine temperature warning: ${temperature}°C exceeding 100°C threshold`;
      }
    } else if (eqId === 'DR-001' && Math.random() < 0.25) {
      // Drill has hydraulic seal pressure variance
      hydraulicPressure = Number((hydraulicPressure - 60 - Math.random() * 30).toFixed(1));
      if (hydraulicPressure < 180) {
        anomalyDetected = true;
        anomalyReason = `Low rotary hydraulic pressure: ${hydraulicPressure} bar (Nominal >220)`;
      }
    } else if (Math.random() < 0.02) {
      vibration = Number((vibration + 4.5).toFixed(1));
      if (vibration > 6.0) {
        anomalyDetected = true;
        anomalyReason = `High bearing vibration spike detected: ${vibration} mm/s RMS`;
      }
    }
  } else if (currentStatus === 'Idle') {
    engineRpm = prev ? randomDrift(prev.engineRpm, 650, 850, 15) : 720;
    temperature = prev ? randomDrift(prev.temperature, 65, 78, 0.4) : 71.0;
    oilPressure = prev ? randomDrift(prev.oilPressure, 28, 40, 0.8) : 34.0;
    vibration = prev ? randomDrift(prev.vibration, 0.4, 1.2, 0.1) : 0.8;
    fuelConsumptionRate = prev ? randomDrift(prev.fuelConsumptionRate, 8, 16, 0.5) : 12.0;
    hydraulicPressure = 80;
    batteryVoltage = 25.8;
    engineLoad = 12;
  } else if (currentStatus === 'Maintenance' || currentStatus === 'Breakdown') {
    engineRpm = 0;
    temperature = prev ? Math.max(26, prev.temperature - 0.5) : 32.0;
    oilPressure = 0;
    vibration = 0.0;
    fuelConsumptionRate = 0;
    hydraulicPressure = 0;
    batteryVoltage = 24.1;
    engineLoad = 0;
    if (currentStatus === 'Breakdown') {
      anomalyDetected = true;
      anomalyReason = 'Equipment flagged in Breakdown state. Engine shut down by interlock.';
    }
  } else {
    // Offline
    engineRpm = 0;
    temperature = 24.0;
    oilPressure = 0;
    vibration = 0.0;
    fuelConsumptionRate = 0;
    hydraulicPressure = 0;
    batteryVoltage = 0;
    engineLoad = 0;
  }

  const reading: TelemetryReading = {
    equipmentId: eqId,
    equipmentName: name,
    equipmentType: type,
    timestamp: new Date().toISOString(),
    engineRpm: Math.round(engineRpm),
    temperature: Number(temperature.toFixed(1)),
    oilPressure: Number(oilPressure.toFixed(1)),
    vibration: Number(vibration.toFixed(2)),
    fuelLevel: Number(fuelLevel.toFixed(1)),
    fuelConsumptionRate: Number(fuelConsumptionRate.toFixed(1)),
    hydraulicPressure: Number(hydraulicPressure.toFixed(1)),
    batteryVoltage: Number(batteryVoltage.toFixed(1)),
    engineLoad: Math.round(engineLoad),
    operationalStatus: currentStatus,
    anomalyDetected,
    anomalyReason,
  };

  // Update ring buffer
  latestReadings.set(eqId, reading);
  const hist = telemetryHistory.get(eqId) || [];
  hist.push(reading);
  if (hist.length > 50) hist.shift(); // retain last 50 data points
  telemetryHistory.set(eqId, hist);

  return reading;
}

// Seed initial telemetry buffer on server startup so charts have instant data
export function initializeTelemetryBuffer() {
  inMemoryEquipmentStore.forEach((eq) => {
    // Generate 20 historical points stepping backward in 5-second intervals
    const now = Date.now();
    const hist: TelemetryReading[] = [];
    for (let i = 20; i >= 0; i--) {
      const pastTime = new Date(now - i * 5000).toISOString();
      const reading = generateReadingForEquipment(
        eq.equipmentId,
        eq.status as any,
        eq.name,
        eq.type
      );
      reading.timestamp = pastTime;
      hist.push(reading);
    }
    telemetryHistory.set(eq.equipmentId, hist);
    latestReadings.set(eq.equipmentId, hist[hist.length - 1]);
  });
}

// Background simulation ticker
let simInterval: NodeJS.Timeout | null = null;
let isSimulatorRunning = false;

export function startTelemetrySimulator(intervalMs: number = 3000) {
  if (isSimulatorRunning) return;
  isSimulatorRunning = true;

  simInterval = setInterval(async () => {
    const batch: TelemetryReading[] = [];
    for (const eq of inMemoryEquipmentStore) {
      const reading = generateReadingForEquipment(
        eq.equipmentId,
        eq.status as any,
        eq.name,
        eq.type
      );
      batch.push(reading);

      // Async write to MongoDB if anomaly detected or periodically (every 10s)
      if (reading.anomalyDetected || Math.random() < 0.1) {
        try {
          await Telemetry.create({
            equipmentId: reading.equipmentId,
            timestamp: new Date(reading.timestamp),
            engineRpm: reading.engineRpm,
            temperature: reading.temperature,
            oilPressure: reading.oilPressure,
            vibration: reading.vibration,
            fuelLevel: reading.fuelLevel,
            fuelConsumptionRate: reading.fuelConsumptionRate,
            hydraulicPressure: reading.hydraulicPressure,
            batteryVoltage: reading.batteryVoltage,
            engineLoad: reading.engineLoad,
            operationalStatus: reading.operationalStatus,
            anomalyDetected: reading.anomalyDetected,
            anomalyReason: reading.anomalyReason,
          });
        } catch {
          // Non-blocking fallback if MongoDB is not connected
        }
      }
    }

    // Broadcast to SSE listeners
    sseListeners.forEach((listener) => {
      try {
        listener(batch);
      } catch (err) {
        console.error('Error sending SSE packet:', err);
      }
    });
  }, intervalMs);
}

export function stopTelemetrySimulator() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
  isSimulatorRunning = false;
}

export function getSimulatorStatus() {
  return {
    isRunning: isSimulatorRunning,
    monitoredEquipments: inMemoryEquipmentStore.length,
    activeSubscribers: sseListeners.size,
  };
}

export function getLatestReadingsList(): TelemetryReading[] {
  return Array.from(latestReadings.values());
}

export function getEquipmentTelemetryHistory(eqId: string): TelemetryReading[] {
  return telemetryHistory.get(eqId.toUpperCase()) || [];
}

export function registerSSEListener(listener: SSEListener): () => void {
  sseListeners.add(listener);
  return () => {
    sseListeners.delete(listener);
  };
}

// Inject manual anomaly for real-time testing
export function triggerTelemetryAnomaly(
  eqId: string,
  anomalyType: 'temperature' | 'vibration' | 'pressure' | 'rpm'
): TelemetryReading | null {
  const current = latestReadings.get(eqId.toUpperCase());
  if (!current) return null;

  const altered = { ...current, timestamp: new Date().toISOString(), anomalyDetected: true };
  if (anomalyType === 'temperature') {
    altered.temperature = 108.5;
    altered.anomalyReason = 'Simulated Overheating: Engine coolant temperature spiked to 108.5°C';
  } else if (anomalyType === 'vibration') {
    altered.vibration = 8.75;
    altered.anomalyReason = 'Simulated Bearing Fault: Extreme vibration 8.75 mm/s RMS detected';
  } else if (anomalyType === 'pressure') {
    altered.oilPressure = 14.2;
    altered.anomalyReason = 'Simulated Oil Loss: Engine oil pressure dropped to critical 14.2 PSI';
  } else {
    altered.engineRpm = 2450;
    altered.anomalyReason = 'Simulated Overspeed: Engine RPM exceeded governor limit (2450 RPM)';
  }

  latestReadings.set(eqId.toUpperCase(), altered);
  const hist = telemetryHistory.get(eqId.toUpperCase()) || [];
  hist.push(altered);
  if (hist.length > 50) hist.shift();
  telemetryHistory.set(eqId.toUpperCase(), hist);

  // Broadcast immediate update
  sseListeners.forEach((listener) => listener([altered]));

  return altered;
}
