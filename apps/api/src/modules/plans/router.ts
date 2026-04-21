import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import {
  ConfirmPlanSchema,
  CreatePlanSchema,
  ReferToAgenciesSchema,
  UpdatePlanSchema,
} from '@tripsync/shared';
import * as planService from './service.js';
import * as referralService from '../referrals/service.js';

export const plansRouter = Router();

plansRouter.post(
  '/',
  authenticate,
  validate(CreatePlanSchema),
  asyncHandler(async (req, res) => {
    const plan = await planService.create(req.userId!, req.body);
    res.status(201).json({ data: plan });
  }),
);

plansRouter.get(
  '/slug/:slug',
  asyncHandler(async (req, res) => {
    const plan = await planService.getBySlug(param(req.params.slug));
    res.json({ data: plan });
  }),
);

plansRouter.get(
  '/my',
  authenticate,
  asyncHandler(async (req, res) => {
    const plans = await planService.listUserPlans(req.userId!);
    res.json({ data: plans });
  }),
);

plansRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const plan = await planService.getById(param(req.params.id));
    res.json({ data: plan });
  }),
);

plansRouter.patch(
  '/:id',
  authenticate,
  validate(UpdatePlanSchema),
  asyncHandler(async (req, res) => {
    const plan = await planService.update(param(req.params.id), req.userId!, req.body);
    res.json({ data: plan });
  }),
);

plansRouter.post(
  '/:id/publish',
  authenticate,
  asyncHandler(async (req, res) => {
    const plan = await planService.publish(param(req.params.id), req.userId!);
    res.json({ data: plan });
  }),
);

plansRouter.post(
  '/:id/refer',
  authenticate,
  validate(ReferToAgenciesSchema),
  asyncHandler(async (req, res) => {
    await referralService.referToAgencies(param(req.params.id), req.userId!, req.body.agencyIds);
    res.json({ data: { success: true } });
  }),
);

plansRouter.post(
  '/:id/confirm',
  authenticate,
  validate(ConfirmPlanSchema),
  asyncHandler(async (req, res) => {
    const result = await planService.confirm(param(req.params.id), req.userId!, req.body.offerId);
    res.json({ data: result });
  }),
);

plansRouter.post(
  '/:id/cancel',
  authenticate,
  asyncHandler(async (req, res) => {
    const plan = await planService.cancel(param(req.params.id), req.userId!);
    res.json({ data: plan });
  }),
);

plansRouter.get(
  '/:id/offers',
  authenticate,
  asyncHandler(async (req, res) => {
    const offers = await planService.listPlanOffers(param(req.params.id), req.userId!);
    res.json({ data: offers });
  }),
);

// Corporate plans listing — agencies only
plansRouter.get(
  '/corporate/open',
  authenticate,
  asyncHandler(async (req, res) => {
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const plans = await planService.listOpenCorporatePlans(req.userId!, { cursor, limit });
    res.json({ data: plans });
  }),
);
