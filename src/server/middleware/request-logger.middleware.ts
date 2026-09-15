import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

/** Log each request with method, path, status, and duration. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const started = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - started;
    logger.info(`${req.method} ${req.path} -> ${res.statusCode} (${durationMs}ms)`);
  });
  next();
}
