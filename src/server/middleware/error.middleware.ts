import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

/** Catch-all error handler. Register last, after all routes. */
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error(err.message, err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message },
  });
}
