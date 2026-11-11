import type { Request, Response, NextFunction } from 'express';
import { InsufficientStockError } from '../services/inventoryService.js';
import { InvalidStateTransitionError } from '../services/orderService.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[API Error]:', err);

  if (err instanceof InsufficientStockError) {
    return res.status(409).json({
      error: 'Insufficient stock',
      message: err.message,
      variantId: err.variantId,
      available: err.available,
      requested: err.requested,
    });
  }

  if (err instanceof InvalidStateTransitionError) {
    return res.status(400).json({
      error: 'Invalid state transition',
      message: err.message,
    });
  }

  const statusCode = err.statusCode || (err.status && typeof err.status === 'number' ? err.status : 500);
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal Server Error' : err.name || 'Request Failed',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
