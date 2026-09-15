import type { Response } from 'express';
import type { ApiResponse } from '../types/index.js';

export function ok<T>(res: Response, data: T, message?: string): void {
  const body: ApiResponse<T> = { success: true, data, message };
  res.json(body);
}

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: ApiResponse<never> = { success: false, error: { code, message, details } };
  res.status(status).json(body);
}
