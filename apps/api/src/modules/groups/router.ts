import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import * as groupService from './service.js';

export const groupsRouter = Router();

groupsRouter.get(
  '/my',
  authenticate,
  asyncHandler(async (req, res) => {
    const groups = await groupService.listMyTrips(req.userId!);
    res.json({ data: groups });
  }),
);

groupsRouter.post(
  '/:id/join',
  authenticate,
  asyncHandler(async (req, res) => {
    const member = await groupService.joinGroup(param(req.params.id), req.userId!);
    res.json({ data: member });
  }),
);

groupsRouter.post(
  '/:id/leave',
  authenticate,
  asyncHandler(async (req, res) => {
    await groupService.leaveGroup(param(req.params.id), req.userId!);
    res.json({ data: { success: true } });
  }),
);

groupsRouter.get(
  '/:id/members',
  asyncHandler(async (req, res) => {
    const result = await groupService.getMembers(param(req.params.id));
    res.json({ data: result });
  }),
);

groupsRouter.post(
  '/:id/approve/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const member = await groupService.approveJoin(param(req.params.id), req.userId!, param(req.params.userId));
    res.json({ data: member });
  }),
);

groupsRouter.post(
  '/:id/remove/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    await groupService.removeMember(param(req.params.id), req.userId!, param(req.params.userId));
    res.json({ data: { success: true } });
  }),
);
