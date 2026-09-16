import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

export const requireRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: This operation requires one of the following roles: [${allowedRoles.join(', ')}]. Your current role is: ${req.user.role}.`,
      });
      return;
    }

    next();
  };
};
