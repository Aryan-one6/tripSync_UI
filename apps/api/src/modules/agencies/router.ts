import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import type { z } from 'zod';
import {
  InviteAgencyMemberSchema,
  BrowseAgenciesSchema,
  RegisterAgencySchema,
  SubmitAgencyVerificationSchema,
  UpdateAgencyMemberSchema,
  UpdateAgencySchema,
} from '@tripsync/shared';
import * as agencyService from './service.js';

export const agenciesRouter = Router();

agenciesRouter.post(
  '/',
  authenticate,
  validate(RegisterAgencySchema),
  asyncHandler(async (req, res) => {
    const agency = await agencyService.register(req.userId!, req.body);
    res.status(201).json({ data: agency });
  }),
);

agenciesRouter.get(
  '/browse',
  validateQuery(BrowseAgenciesSchema),
  asyncHandler(async (req, res) => {
    const result = await agencyService.browse(
      req.validatedQuery as z.infer<typeof BrowseAgenciesSchema>,
    );
    res.json({ data: result.agencies, meta: { cursor: result.cursor } });
  }),
);

agenciesRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const agency = await agencyService.getBySlug(param(req.params.slug));
    res.json({ data: agency });
  }),
);

agenciesRouter.patch(
  '/:id',
  authenticate,
  validate(UpdateAgencySchema),
  asyncHandler(async (req, res) => {
    const agency = await agencyService.update(param(req.params.id), req.userId!, req.body);
    res.json({ data: agency });
  }),
);

agenciesRouter.post(
  '/:id/verification/submit',
  authenticate,
  validate(SubmitAgencyVerificationSchema),
  asyncHandler(async (req, res) => {
    const agency = await agencyService.submitVerification(
      param(req.params.id),
      req.userId!,
      req.body,
    );
    res.json({ data: agency });
  }),
);

agenciesRouter.get(
  '/:id/members',
  authenticate,
  asyncHandler(async (req, res) => {
    const members = await agencyService.listMembers(param(req.params.id), req.userId!);
    res.json({ data: members });
  }),
);

agenciesRouter.post(
  '/:id/members',
  authenticate,
  validate(InviteAgencyMemberSchema),
  asyncHandler(async (req, res) => {
    const member = await agencyService.inviteMember(param(req.params.id), req.userId!, req.body);
    res.status(201).json({ data: member });
  }),
);

agenciesRouter.patch(
  '/:id/members/:userId',
  authenticate,
  validate(UpdateAgencyMemberSchema),
  asyncHandler(async (req, res) => {
    const member = await agencyService.updateMember(
      param(req.params.id),
      req.userId!,
      param(req.params.userId),
      req.body,
    );
    res.json({ data: member });
  }),
);

agenciesRouter.delete(
  '/:id/members/:userId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await agencyService.removeMember(
      param(req.params.id),
      req.userId!,
      param(req.params.userId),
    );
    res.json({ data: result });
  }),
);

agenciesRouter.get(
  '/:id/analytics',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await agencyService.getAgencyAnalytics(param(req.params.id), req.userId!);
    res.json({ data });
  }),
);

agenciesRouter.get(
  '/:id/calendar',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await agencyService.getAgencyBookingCalendar(param(req.params.id), req.userId!);
    res.json({ data });
  }),
);

agenciesRouter.get(
  '/:id/risk-flags',
  authenticate,
  asyncHandler(async (req, res) => {
    const flags = await agencyService.listAgencyRiskFlags(param(req.params.id), req.userId!);
    res.json({ data: flags });
  }),
);

agenciesRouter.get(
  '/:id/insurance/quotes',
  authenticate,
  asyncHandler(async (req, res) => {
    const quotes = await agencyService.listInsuranceQuotes(param(req.params.id), req.userId!);
    res.json({ data: quotes });
  }),
);

agenciesRouter.post(
  '/:id/insurance/quotes',
  authenticate,
  asyncHandler(async (req, res) => {
    const quote = await agencyService.createInsuranceQuote(param(req.params.id), req.userId!, {
      groupId: req.body.groupId,
      targetUserId: req.body.targetUserId,
      provider: req.body.provider,
      planCode: req.body.planCode,
      premium: req.body.premium,
      coverage: req.body.coverage,
      metadata: req.body.metadata,
    });
    res.status(201).json({ data: quote });
  }),
);

agenciesRouter.get(
  '/:id/customers',
  authenticate,
  asyncHandler(async (req, res) => {
    const customers = await agencyService.listCustomers(param(req.params.id), req.userId!);
    res.json({ data: customers });
  }),
);

agenciesRouter.post(
  '/:id/customers',
  authenticate,
  asyncHandler(async (req, res) => {
    const customer = await agencyService.upsertCustomer(param(req.params.id), req.userId!, {
      customerUserId: req.body.customerUserId,
      tags: req.body.tags,
      notes: req.body.notes,
    });
    res.status(201).json({ data: customer });
  }),
);

agenciesRouter.get(
  '/:id/campaigns',
  authenticate,
  asyncHandler(async (req, res) => {
    const campaigns = await agencyService.listCampaigns(param(req.params.id), req.userId!);
    res.json({ data: campaigns });
  }),
);

agenciesRouter.post(
  '/:id/campaigns',
  authenticate,
  asyncHandler(async (req, res) => {
    const campaign = await agencyService.createCampaign(param(req.params.id), req.userId!, {
      name: req.body.name,
      description: req.body.description,
      targetTags: req.body.targetTags,
      scheduledAt: req.body.scheduledAt,
    });
    res.status(201).json({ data: campaign });
  }),
);

agenciesRouter.post(
  '/trust/evaluate',
  authenticate,
  authorize('platform_admin'),
  asyncHandler(async (_req, res) => {
    const results = await agencyService.evaluateAgencyTrustProfiles();
    res.json({ data: results });
  }),
);
