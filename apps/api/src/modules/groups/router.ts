import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import { InviteGroupMemberSchema, SubmitOfferViaGroupSchema } from '@tripsync/shared';
import * as groupService from './service.js';
import * as offerService from '../offers/service.js';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, BadRequestError } from '../../lib/errors.js';
import { createSystemMessage } from '../chat/service.js';

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

groupsRouter.post(
  '/:id/invite',
  authenticate,
  validate(InviteGroupMemberSchema),
  asyncHandler(async (req, res) => {
    const member = await groupService.inviteMember(param(req.params.id), req.userId!, req.body.userId);
    res.status(201).json({ data: member });
  }),
);

// ── Submit offer via group chat ─────────────────────────────────────────────
// The SubmitOfferModal in group-chat.tsx calls POST /groups/:id/offers.
// This resolves the group → plan and delegates to the offer service, then
// posts a system message in the group chat to announce the new offer.
groupsRouter.post(
  '/:id/offers',
  authenticate,
  validate(SubmitOfferViaGroupSchema),
  asyncHandler(async (req, res) => {
    const groupId = param(req.params.id);

    // Resolve group → plan
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { planId: true },
    });
    if (!group) throw new NotFoundError('Group');
    if (!group.planId) throw new BadRequestError('This group is not associated with a plan');

    // Delegate to existing offer service (handles agency validation, plan status, etc.)
    const offer = await offerService.submitOffer(req.userId!, {
      planId: group.planId,
      pricePerPerson: req.body.pricePerPerson,
      pricingTiers: req.body.pricingTiers,
      inclusions: req.body.inclusions,
      itinerary: req.body.itinerary,
      cancellationPolicy: req.body.cancellationPolicy,
      cancellationRules: req.body.cancellationRules,
      validUntil: req.body.validUntil,
    });

    // Post system message so all chat members see the new offer inline
    const priceFormatted = `₹${offer.pricePerPerson.toLocaleString('en-IN')}`;
    await createSystemMessage(
      groupId,
      `${offer.agency.name} submitted a new offer at ${priceFormatted}/person.`,
      { offerId: offer.id, planId: group.planId, action: 'offer_submitted' },
    );

    res.status(201).json({ data: offer });
  }),
);
