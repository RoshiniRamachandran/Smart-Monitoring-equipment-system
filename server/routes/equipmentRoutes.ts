import { Router } from 'express';
import {
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentMapLocations,
} from '../controllers/equipmentController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = Router();

// Public/Read-only for all crew
router.get('/', getAllEquipment);
router.get('/map/locations', getEquipmentMapLocations);
router.get('/:id', getEquipmentById);

// Admin-only operations for Equipment fleet modification
router.post('/', protect, authorize('Admin'), createEquipment);
router.put('/:id', protect, authorize('Admin'), updateEquipment);
router.delete('/:id', protect, authorize('Admin'), deleteEquipment);

export default router;
