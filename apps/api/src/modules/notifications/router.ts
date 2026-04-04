import { Router } from 'express';
import {
  NotificationListQuerySchema,
  ProfileViewListQuerySchema,
  type NotificationListQuery,
  type ProfileViewListQuery,
} from '@tripsync/shared';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { validateQuery } from '../../middleware/validate.js';
import { param } from '../../lib/helpers.js';
import * as notificationService from './service.js';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/',
  authenticate,
  validateQuery(NotificationListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as NotificationListQuery;
    const items = await notificationService.listNotificationsForUser(req.userId!, query.limit);
    res.json({ data: items });
  }),
);

notificationsRouter.post(
  '/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await notificationService.markNotificationAsRead(
      req.userId!,
      param(req.params.id),
    );
    res.json({ data: result });
  }),
);

notificationsRouter.post(
  '/read-all',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await notificationService.markAllNotificationsAsRead(req.userId!);
    res.json({ data: result });
  }),
);

notificationsRouter.get(
  '/profile-views',
  authenticate,
  validateQuery(ProfileViewListQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as ProfileViewListQuery;
    const items = await notificationService.listRecentProfileViewsForOwner(req.userId!, query.limit);
    res.json({ data: items });
  }),
);
