import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

// Validates + replaces req.body with the parsed (trimmed/typed) result so
// downstream controllers can trust its shape without re-checking it.
export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const message = result.error.errors[0]?.message ?? 'Invalid request.';
    return next(new AppError(message, 400));
  }

  req.body = result.data;
  next();
};
