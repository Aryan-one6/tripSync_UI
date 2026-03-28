import { Router } from 'express';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import * as userService from './service.js';

export const usersRouter = Router();

usersRouter.get(
  '/profile/:username',
  asyncHandler(async (req, res) => {
    const profile = await userService.getPublicProfile(param(req.params.username));
    res.json({ data: profile });
  }),
);
