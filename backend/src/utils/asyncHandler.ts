import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Wraps async route handlers so a rejected promise reaches Express's error
// middleware instead of crashing the process or hanging the request.
export const asyncHandler =
  (handler: AsyncRouteHandler) => (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
