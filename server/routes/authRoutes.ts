import { Router } from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  getAllUsers,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes (require valid JWT)
router.get('/me', protect, getCurrentUser);

// Role-protected routes (Admin only)
router.get('/users', protect, authorize('Admin'), getAllUsers);

export default router;
