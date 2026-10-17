import { Router } from 'express';
import {
  getShiftHandovers,
  getShiftHandoverById,
  createShiftHandover,
} from '../controllers/handoverController.js';

const router = Router();

router.get('/', getShiftHandovers);
router.get('/:id', getShiftHandoverById);
router.post('/', createShiftHandover);

export default router;
