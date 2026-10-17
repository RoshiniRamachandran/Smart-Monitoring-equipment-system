import bcrypt from 'bcryptjs';
import { User, UserRole } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import mongoose from 'mongoose';

// Industrial Seed Users for testing & operations
export const demoUsers = [
  {
    id: 'demo-admin-01',
    name: 'Marcus Vance',
    email: 'admin@mining.com',
    password: 'Password123!',
    role: 'Admin' as UserRole,
    department: 'Site Engineering & Administration',
    assignedEquipment: ['EXC-001', 'DT-001', 'LD-001', 'DR-001'],
  },
  {
    id: 'demo-manager-02',
    name: 'Elena Rostova',
    email: 'manager@mining.com',
    password: 'Password123!',
    role: 'Manager' as UserRole,
    department: 'Fleet Operations & Maintenance',
    assignedEquipment: ['EXC-001', 'DT-001'],
  },
  {
    id: 'demo-operator-03',
    name: 'Tariq Al-Mansoor',
    email: 'operator@mining.com',
    password: 'Password123!',
    role: 'Operator' as UserRole,
    department: 'Heavy Machinery Field Crew',
    assignedEquipment: ['EXC-001'],
  },
];

export const seedDemoUsersToMongo = async () => {
  if (mongoose.connection.readyState !== 1) return;
  try {
    for (const demoUser of demoUsers) {
      const exists = await User.findOne({ email: demoUser.email });
      if (!exists) {
        await User.create({
          name: demoUser.name,
          email: demoUser.email,
          password: demoUser.password,
          role: demoUser.role,
          department: demoUser.department,
          assignedEquipment: demoUser.assignedEquipment,
        });
      }
    }
  } catch (err) {
    console.warn('Seed users check:', err);
  }
};
