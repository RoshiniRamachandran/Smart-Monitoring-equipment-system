import { Router } from 'express';
import {
  getEquipmentPrediction,
  getFleetPredictionsOverview,
  getEquipmentPredictionHistory,
  getEquipmentHealthHistory,
  getFleetHealthTimeline,
} from '../controllers/predictiveController.js';

const router = Router();

router.get('/fleet-overview', getFleetPredictionsOverview);
router.get('/health-history-fleet', getFleetHealthTimeline);
router.get('/health-history/:equipmentId', getEquipmentHealthHistory);
router.get('/equipment/:equipmentId', getEquipmentPrediction);
router.get('/history/:equipmentId', getEquipmentPredictionHistory);

export default router;
