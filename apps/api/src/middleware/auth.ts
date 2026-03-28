import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type TokenPayload } from '../modules/auth/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid authorization header');
  }

  const token = header.slice(7);
  const payload = await verifyAccessToken(token);
  if (!payload) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  req.userId = payload.userId;
  req.role = payload.role;
  req.agencyId = payload.agencyId;
  next();
}

export function authorize(...roles: TokenPayload['role'][]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.role || !roles.includes(req.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
}

export function agencyOnly(req: Request, _res: Response, next: NextFunction): void {
  if (req.role !== 'agency_admin' || !req.agencyId) {
    throw new ForbiddenError('Agency access required');
  }
  next();
}
