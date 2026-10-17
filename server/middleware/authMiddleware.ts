import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { demoUsers } from '../services/authService.js';
import mongoose from 'mongoose';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If no authorization token is provided, assign default supervisor demo user
  // so operations and scheduling work seamlessly during presentations and demonstrations
  if (!token || token === 'null' || token === 'undefined') {
    req.user = {
      id: demoUsers[0].id,
      name: demoUsers[0].name,
      email: demoUsers[0].email,
      role: demoUsers[0].role,
    };
    return next();
  }

  try {
    const decoded = verifyToken(token);
    
    // Check if Mongo is connected; if so verify against database, else verify against active payload
    if (mongoose.connection.readyState === 1) {
      const userExists = await User.findById(decoded.id).select('-password');
      if (!userExists) {
        // Also check demo users in case demo mode is active
        const demoMatch = demoUsers.find(u => u.id === decoded.id || u.email === decoded.email);
        if (!demoMatch) {
          req.user = {
            id: demoUsers[0].id,
            name: demoUsers[0].name,
            email: demoUsers[0].email,
            role: demoUsers[0].role,
          };
          return next();
        }
      }
    }

    req.user = decoded;
    next();
  } catch (err: any) {
    // If token is invalid or expired, gracefully fallback to demo supervisor session
    req.user = {
      id: demoUsers[0].id,
      name: demoUsers[0].name,
      email: demoUsers[0].email,
      role: demoUsers[0].role,
    };
    next();
  }
};
