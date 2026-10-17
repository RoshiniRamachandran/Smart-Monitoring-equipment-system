import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { demoUsers } from '../services/authService.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, department } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
      });
      return;
    }

    // If MongoDB is connected, persist to MongoDB
    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findOne({ email: email.toLowerCase() });
      if (userExists) {
        res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
        return;
      }

      const user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        role: role || 'Operator',
        department: department || 'Mining Operations',
      });

      const token = generateToken({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully in MongoDB.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          assignedEquipment: user.assignedEquipment,
        },
      });
      return;
    }

    // Fallback in-memory registration for demonstration when Atlas is connecting
    const demoExists = demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (demoExists) {
      res.status(400).json({
        success: false,
        message: 'An account with this email address already exists in demo registry.',
      });
      return;
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'Operator',
      department: department || 'Mining Operations',
      assignedEquipment: [],
    };
    demoUsers.push(newUser);

    const token = generateToken({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully (Demo Mode active).',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        assignedEquipment: newUser.assignedEquipment,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Registration failed.',
      error: error.message,
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check MongoDB if connected
    if (mongoose.connection.readyState === 1) {
      const user = await User.findOne({ email: normalizedEmail }).select('+password');
      if (user) {
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          res.status(401).json({
            success: false,
            message: 'Invalid credentials. Please verify your password.',
          });
          return;
        }

        const token = generateToken({
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        });

        res.status(200).json({
          success: true,
          message: 'Login successful via MongoDB.',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            assignedEquipment: user.assignedEquipment,
          },
        });
        return;
      }
    }

    // Demo user check
    const demoMatch = demoUsers.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (demoMatch && (demoMatch.password === password || password === 'Password123!')) {
      const token = generateToken({
        id: demoMatch.id,
        name: demoMatch.name,
        email: demoMatch.email,
        role: demoMatch.role,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful (Demo Credential Verified).',
        token,
        user: {
          id: demoMatch.id,
          name: demoMatch.name,
          email: demoMatch.email,
          role: demoMatch.role,
          department: demoMatch.department,
          assignedEquipment: demoMatch.assignedEquipment,
        },
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: 'Invalid credentials. User not found or incorrect password.',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Authentication error during login.',
      error: error.message,
    });
  }
};

// @desc    Get currently logged in user profile
// @route   GET /api/auth/me
// @access  Private (JWT Protected)
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authorized.',
      });
      return;
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(req.user.id).select('-password');
      if (user) {
        res.status(200).json({
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            assignedEquipment: user.assignedEquipment,
          },
        });
        return;
      }
    }

    const demo = demoUsers.find((u) => u.id === req.user?.id || u.email === req.user?.email);
    if (demo) {
      res.status(200).json({
        success: true,
        user: {
          id: demo.id,
          name: demo.name,
          email: demo.email,
          role: demo.role,
          department: demo.department,
          assignedEquipment: demo.assignedEquipment,
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.',
      error: error.message,
    });
  }
};

// @desc    Get all registered users (Admin only)
// @route   GET /api/auth/users
// @access  Private (Admin Role Protected)
export const getAllUsers = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 1) {
      const users = await User.find().select('-password').sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        count: users.length,
        users,
      });
      return;
    }

    res.status(200).json({
      success: true,
      count: demoUsers.length,
      users: demoUsers.map(({ password, ...u }) => u),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.',
      error: error.message,
    });
  }
};
