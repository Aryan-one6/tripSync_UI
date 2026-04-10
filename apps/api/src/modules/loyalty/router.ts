import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validate } from '../../middleware/validate.js';
import { z } from 'zod';
import { param } from '../../lib/helpers.js';
import * as loyaltyService from './service.js';

export const loyaltyRouter = Router();

// GET /loyalty/balance — current user's point balance
loyaltyRouter.get(
  '/balance',
  authenticate,
  asyncHandler(async (req, res) => {
    const balance = await loyaltyService.getLoyaltyBalance(req.userId!);
    res.json({ data: { balance } });
  }),
);

// GET /loyalty/ledger — transaction history
loyaltyRouter.get(
  '/ledger',
  authenticate,
  asyncHandler(async (req, res) => {
    const ledger = await loyaltyService.getLoyaltyLedger(req.userId!);
    res.json({ data: ledger });
  }),
);

// POST /loyalty/admin/adjust — admin manual adjustment
loyaltyRouter.post(
  '/admin/adjust',
  authenticate,
  authorize('platform_admin'),
  validate(
    z.object({
      userId: z.string().uuid(),
      points: z.number().int().refine((n) => n !== 0, { message: 'Points must be non-zero' }),
      description: z.string().min(1).max(500),
    }),
  ),
  asyncHandler(async (req, res) => {
    await loyaltyService.adminAdjustPoints(
      req.body.userId,
      req.body.points,
      req.body.description,
      req.userId!,
    );
    res.json({ data: { ok: true } });
  }),
);

// POST /loyalty/admin/expire — trigger expiry sweep
loyaltyRouter.post(
  '/admin/expire',
  authenticate,
  authorize('platform_admin'),
  asyncHandler(async (_req, res) => {
    const result = await loyaltyService.expireStalePoints();
    res.json({ data: result });
  }),
);
