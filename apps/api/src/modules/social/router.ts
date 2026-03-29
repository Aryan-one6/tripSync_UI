import { Router } from 'express';
import { SocialFeedQuery, SocialFeedQuerySchema } from '@tripsync/shared';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import { validateQuery } from '../../middleware/validate.js';
import * as socialService from './service.js';

export const socialRouter = Router();

socialRouter.get(
  '/feed',
  validateQuery(SocialFeedQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as SocialFeedQuery;
    const items = await socialService.listFeed(query.limit);
    res.json({ data: items });
  }),
);

socialRouter.get(
  '/feed/following',
  authenticate,
  validateQuery(SocialFeedQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as SocialFeedQuery;
    const items = await socialService.listFollowingFeed(req.userId!, query.limit);
    res.json({ data: items });
  }),
);

socialRouter.get(
  '/profiles/:handle',
  asyncHandler(async (req, res) => {
    const profile = await socialService.getPublicProfile(param(req.params.handle));
    res.json({ data: profile });
  }),
);

socialRouter.get(
  '/profiles/:handle/follow-state',
  authenticate,
  asyncHandler(async (req, res) => {
    const state = await socialService.getFollowState(param(req.params.handle), req.userId!);
    res.json({ data: state });
  }),
);

socialRouter.post(
  '/profiles/:handle/follow',
  authenticate,
  asyncHandler(async (req, res) => {
    const state = await socialService.followProfile(param(req.params.handle), req.userId!);
    res.json({ data: state });
  }),
);

socialRouter.delete(
  '/profiles/:handle/follow',
  authenticate,
  asyncHandler(async (req, res) => {
    const state = await socialService.unfollowProfile(param(req.params.handle), req.userId!);
    res.json({ data: state });
  }),
);
