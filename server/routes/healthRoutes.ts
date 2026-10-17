import { Router, Request, Response } from 'express';
import { getDBStatus, connectDB } from '../config/db.js';

const router = Router();

// GET /api/health - Basic health check
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Smart Mining Equipment Monitoring Backend is running.',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// GET /api/status - Comprehensive status check including MongoDB
router.get('/status', (_req: Request, res: Response) => {
  const dbStatus = getDBStatus();
  
  res.status(200).json({
    system: 'Smart Mining Equipment Monitoring System',
    version: '1.0.0 (Phase 1: Project Setup)',
    status: 'operational',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    database: {
      driver: 'Mongoose / MongoDB',
      ...dbStatus,
    },
    phase: {
      current: 'Phase 1 - Project Setup & Architecture Verification',
      completedItems: [
        'MERN Directory Structure Configured',
        'Node.js + Express Backend Initialized',
        'Mongoose & MongoDB Connection Configured',
        'Environment Variables Declared',
        'React Frontend Layout & Client Communication Established',
        'Backend Health & Database Diagnostics API Implemented',
      ],
      nextPhase: 'Phase 2 - Authentication (JWT, bcrypt, User Model, Roles)',
    },
  });
});

// POST /api/database/reconnect - Manual test reconnect trigger
router.post('/database/reconnect', async (_req: Request, res: Response) => {
  const success = await connectDB();
  const dbStatus = getDBStatus();
  res.status(200).json({
    success,
    database: dbStatus,
  });
});

export default router;
