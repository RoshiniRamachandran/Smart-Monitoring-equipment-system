import { Router } from 'express';
import {
  getAllMaintenance,
  createMaintenance,
  updateMaintenance,
  getAllBreakdowns,
  reportBreakdown,
  updateBreakdownStatus,
} from '../controllers/maintenanceController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = Router();

// ==========================================
// MAINTENANCE SCHEDULE ROUTES
// ==========================================

// All crew members can view maintenance schedules
router.get('/', getAllMaintenance);

// Admins, Managers, & Operators can schedule maintenance
router.post('/', protect, authorize('Admin', 'Manager', 'Operator'), createMaintenance);

// Admins, Managers, & Operators can update maintenance progress/complete
router.put('/:id', protect, authorize('Admin', 'Manager', 'Operator'), updateMaintenance);

// ==========================================
// BREAKDOWN INCIDENT ROUTES
// ==========================================

// All crew members can view breakdowns
router.get('/breakdowns/all', getAllBreakdowns);

// Operators, Managers, & Admins can all report machine breakdowns in field
router.post('/breakdowns/report', protect, authorize('Admin', 'Manager', 'Operator'), reportBreakdown);

// All crew members can update breakdown status (e.g. Assessed, Repairing, Resolved)
router.put('/breakdowns/:id/status', protect, authorize('Admin', 'Manager', 'Operator'), updateBreakdownStatus);

export default router;
