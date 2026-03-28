import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { ZodError } from 'zod';
import { env } from '../lib/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      errors: [{ code: err.code, message: err.message }],
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  console.error('Unhandled error:', err);

  res.status(500).json({
    errors: [
      {
        code: 'INTERNAL_ERROR',
        message:
          env.NODE_ENV === 'production'
            ? 'Something went wrong'
            : err.message,
      },
    ],
  });
}
