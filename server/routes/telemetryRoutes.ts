import { Router } from 'express';
import {
  getLatestTelemetry,
  getEquipmentTelemetry,
  streamTelemetry,
  getTelemetryStatus,
  injectAnomaly,
} from '../controllers/telemetryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Streaming endpoint (SSE)
router.get('/stream', streamTelemetry);

// Polling & query endpoints
router.get('/latest', getLatestTelemetry);
router.get('/history/:equipmentId', getEquipmentTelemetry);
router.get('/status', getTelemetryStatus);

// Anomaly testing injector
router.post('/anomaly', protect, injectAnomaly);

export default router;
