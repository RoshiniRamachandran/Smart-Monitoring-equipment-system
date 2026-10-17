import { Router } from 'express';
import {
  getAlarms,
  acknowledgeAlarm,
  resolveAlarm,
  triggerAlarm,
  exportComplianceReportCsv,
  exportReportJson,
  getReportPreview,
} from '../controllers/alarmController.js';

const router = Router();

router.get('/', getAlarms);
router.put('/:id/acknowledge', acknowledgeAlarm);
router.put('/:id/resolve', resolveAlarm);
router.post('/trigger', triggerAlarm);
router.get('/export-csv', exportComplianceReportCsv);
router.get('/export-json', exportReportJson);
router.get('/preview', getReportPreview);

export default router;
