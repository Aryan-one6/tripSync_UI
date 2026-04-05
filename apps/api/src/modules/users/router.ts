import { Router } from 'express';
import { UserSearchQuerySchema } from '@tripsync/shared';
import { asyncHandler } from '../../middleware/async-handler.js';
import { authenticate } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import { param } from '../../lib/helpers.js';
import * as userService from './service.js';

export const usersRouter = Router();

usersRouter.get(
  '/search',
  authenticate,
  validateQuery(UserSearchQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as { q: string };
    const users = await userService.searchUsers(req.userId!, query.q);
    res.json({ data: users });
  }),
);

usersRouter.get(
  '/profile/:username',
  asyncHandler(async (req, res) => {
    const profile = await userService.getPublicProfile(param(req.params.username));
    res.json({ data: profile });
  }),
);
