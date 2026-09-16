import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('⚠️ [ErrorHandler]:', err);

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'A record with this unique value already exists.',
        details: err.meta,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'The requested record was not found.',
      });
      return;
    }
  }

  // Database check constraint violation
  if (err?.code === '23514') {
    res.status(400).json({
      success: false,
      message: 'Database constraint violation: Check constraint failed.',
      details: err.message,
    });
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
