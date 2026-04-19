import { Router } from 'express';
import { authenticate, agencyOnly } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import * as referralService from './service.js';

export const referralsRouter = Router();

// ─── Agency Referrals ─────────────────────────────────────────────────────────

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

// ─── User-to-User Referrals ───────────────────────────────────────────────────

// POST /referrals/generate-link — Generate a new referral link
referralsRouter.post(
  '/generate-link',
  authenticate,
  asyncHandler(async (req, res) => {
    const link = await referralService.generateReferralLink(req.userId!);
    res.json({ data: link });
  }),
);

// GET /referrals/my-referrals — Get list of referrals made by user
referralsRouter.get(
  '/my-referrals',
  authenticate,
  asyncHandler(async (req, res) => {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 20;
    const result = await referralService.getMyReferrals(req.userId!, page, pageSize);
    res.json({ data: result });
  }),
);

// GET /referrals/stats — Get referral statistics
referralsRouter.get(
  '/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const stats = await referralService.getReferralStats(req.userId!);
    res.json({ data: stats });
  }),
);

// GET /referrals/metrics — Get referral metrics with conversion rates
referralsRouter.get(
  '/metrics',
  authenticate,
  asyncHandler(async (req, res) => {
    const metrics = await referralService.getReferralMetrics(req.userId!);
    res.json({ data: metrics });
  }),
);
