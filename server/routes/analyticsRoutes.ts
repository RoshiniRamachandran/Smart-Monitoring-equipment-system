import { Router } from 'express';
import {
  getOperationalKPIs,
  getAnalyticsDistributions,
  getFuelEfficiencyAnalytics,
} from '../controllers/analyticsController.js';

const router = Router();

router.get('/kpis', getOperationalKPIs);
router.get('/distributions', getAnalyticsDistributions);
router.get('/fuel-efficiency', getFuelEfficiencyAnalytics);

export default router;
