import { Router } from 'express';
import { authenticate, agencyOnly } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import * as referralService from './service.js';

export const referralsRouter = Router();

// GET /referrals/my — Agency's incoming referrals
referralsRouter.get(
  '/my',
  authenticate,
  agencyOnly,
  asyncHandler(async (req, res) => {
    const referrals = await referralService.getAgencyReferrals(req.userId!);
    res.json({ data: referrals });
  }),
);
