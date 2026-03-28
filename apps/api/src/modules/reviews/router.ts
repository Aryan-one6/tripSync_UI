import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import { CreateReviewSchema } from '@tripsync/shared';
import * as reviewService from './service.js';

export const reviewsRouter = Router();

reviewsRouter.get('/health', (_req, res) => {
  res.json({ module: 'reviews', status: 'ok' });
});

reviewsRouter.get(
  '/groups/:groupId/eligibility',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await reviewService.getEligibility(param(req.params.groupId), req.userId!);
    res.json({ data: result });
  }),
);

reviewsRouter.get(
  '/groups/:groupId',
  authenticate,
  asyncHandler(async (req, res) => {
    const reviews = await reviewService.listGroupReviews(param(req.params.groupId), req.userId!);
    res.json({ data: reviews });
  }),
);

reviewsRouter.post(
  '/',
  authenticate,
  validate(CreateReviewSchema),
  asyncHandler(async (req, res) => {
    const review = await reviewService.createReview(req.userId!, req.body);
    res.status(201).json({ data: review });
  }),
);
