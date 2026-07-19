import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

// Centralized so controllers just `throw` and never format an HTTP response
// themselves — must be registered last, after all routes.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { path: req.path, statusCode: err.statusCode });
    }
    return res.status(err.statusCode).json({ message: err.message });
  }

  logger.error('Unhandled error', { error: err instanceof Error ? err.message : String(err), path: req.path });
  return res.status(500).json({ message: 'Internal server error' });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
};
