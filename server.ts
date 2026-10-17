import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './server/config/db.js';
import healthRoutes from './server/routes/healthRoutes.js';
import authRoutes from './server/routes/authRoutes.js';
import equipmentRoutes from './server/routes/equipmentRoutes.js';
import maintenanceRoutes from './server/routes/maintenanceRoutes.js';
import telemetryRoutes from './server/routes/telemetryRoutes.js';
import predictiveRoutes from './server/routes/predictiveRoutes.js';
import analyticsRoutes from './server/routes/analyticsRoutes.js';
import handoverRoutes from './server/routes/handoverRoutes.js';
import alarmRoutes from './server/routes/alarmRoutes.js';
import { seedDemoUsersToMongo } from './server/services/authService.js';
import { seedEquipmentToMongo } from './server/controllers/equipmentController.js';
import { seedMaintenanceDatabase } from './server/controllers/maintenanceController.js';
import { initializeTelemetryBuffer, startTelemetrySimulator } from './server/services/telemetrySimulator.js';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Global Middlewares
  app.use(cors({
    origin: '*',
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Connect to MongoDB
  const isConnected = await connectDB();
  if (isConnected) {
    await seedDemoUsersToMongo();
    await seedEquipmentToMongo();
    await seedMaintenanceDatabase();
  }

  // Initialize IoT Telemetry Simulator
  initializeTelemetryBuffer();
  startTelemetrySimulator(3000); // 3-second live sensor emission

  // API Routes
  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/equipment', equipmentRoutes);
  app.use('/api/maintenance', maintenanceRoutes);
  app.use('/api/telemetry', telemetryRoutes);
  app.use('/api/predictions', predictiveRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/handovers', handoverRoutes);
  app.use('/api/alarms', alarmRoutes);
  app.use('/api/reports', alarmRoutes);

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [Server] Smart Mining Equipment Monitoring Server running on port ${PORT}`);
    console.log(`📡 [API] Health endpoint ready at http://localhost:${PORT}/api/health`);
    console.log(`📊 [API] System status at http://localhost:${PORT}/api/status`);
  });
}

startServer();
