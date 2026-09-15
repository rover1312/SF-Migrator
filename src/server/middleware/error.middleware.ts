import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { fail } from '../utils/api-response';
import { logger } from '../utils/logger';

/** Catch-all error handler. Register last, after all routes. */
export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Upload rejections (bad file type, too large) are client errors, not 500s.
  if (err instanceof MulterError || err.message.startsWith('Unsupported file type')) {
    logger.warn(`Upload rejected: ${err.message}`);
    fail(res, 400, 'UPLOAD_ERROR', err.message);
    return;
  }
  logger.error(err.message, err);
  fail(res, 500, 'INTERNAL_ERROR', err.message);
}
