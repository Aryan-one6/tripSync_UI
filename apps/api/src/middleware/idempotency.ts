import type { Request, Response, NextFunction } from 'express';
import { isRedisConfigured, redis } from '../lib/redis.js';

export const idempotent = () =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!isRedisConfigured) {
      next();
      return;
    }

    const key = req.headers['x-idempotency-key'] as string;
    if (!key) {
      next();
      return;
    }

    const cached = await redis.get(`idem:${key}`);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }

    // Monkey-patch res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      redis.setex(`idem:${key}`, 86400, JSON.stringify(body));
      return originalJson(body);
    };

    next();
  };
