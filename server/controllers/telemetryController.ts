import { Request, Response } from 'express';
import {
  getLatestReadingsList,
  getEquipmentTelemetryHistory,
  getSimulatorStatus,
  triggerTelemetryAnomaly,
  registerSSEListener,
  TelemetryReading,
} from '../services/telemetrySimulator.js';
import { Telemetry } from '../models/Telemetry.js';

// @desc    Get latest telemetry readings for all equipment
// @route   GET /api/telemetry/latest
// @access  Public
export const getLatestTelemetry = async (req: Request, res: Response) => {
  try {
    const readings = getLatestReadingsList();
    res.json({
      success: true,
      count: readings.length,
      timestamp: new Date().toISOString(),
      data: readings,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get time-series telemetry history for a specific equipment
// @route   GET /api/telemetry/history/:equipmentId
// @access  Public
export const getEquipmentTelemetry = async (req: Request, res: Response) => {
  try {
    const { equipmentId } = req.params;
    const history = getEquipmentTelemetryHistory(equipmentId);

    // If MongoDB has more persistent records, we can optionally merge them
    res.json({
      success: true,
      equipmentId: equipmentId.toUpperCase(),
      count: history.length,
      data: history,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Server-Sent Events (SSE) stream of real-time telemetry ticks
// @route   GET /api/telemetry/stream
// @access  Public
export const streamTelemetry = (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering for instant delivery

  // Send initial connected ping
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Send current state immediately
  const initialBatch = getLatestReadingsList();
  res.write(`data: ${JSON.stringify({ type: 'telemetry_batch', data: initialBatch })}\n\n`);

  // Subscribe to ticker
  const unsubscribe = registerSSEListener((batch: TelemetryReading[]) => {
    res.write(`data: ${JSON.stringify({ type: 'telemetry_batch', data: batch })}\n\n`);
  });

  // Keep-alive heartbeat every 15s to prevent cloud reverse proxy timeouts
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  // Clean up when client disconnects
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
};

// @desc    Get simulator engine status
// @route   GET /api/telemetry/status
// @access  Public
export const getTelemetryStatus = async (req: Request, res: Response) => {
  try {
    const status = getSimulatorStatus();
    res.json({ success: true, status });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Inject an anomaly into a machine's telemetry stream (testing/demo)
// @route   POST /api/telemetry/anomaly
// @access  Private (Operators / Managers / Admins)
export const injectAnomaly = async (req: Request, res: Response) => {
  try {
    const { equipmentId, anomalyType } = req.body;
    if (!equipmentId || !anomalyType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide equipmentId and anomalyType (temperature, vibration, pressure, rpm)',
      });
    }

    const updated = triggerTelemetryAnomaly(equipmentId, anomalyType);
    if (!updated) {
      return res.status(404).json({ success: false, message: `Equipment ${equipmentId} not found` });
    }

    res.json({
      success: true,
      message: `Simulated ${anomalyType} anomaly injected for ${equipmentId}`,
      data: updated,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
