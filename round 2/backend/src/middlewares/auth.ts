import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied: No authorization token provided.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authorization token.',
    });
    return;
  }
};
