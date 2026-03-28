import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import type { z } from 'zod';
import {
  BrowseAgenciesSchema,
  RegisterAgencySchema,
  SubmitAgencyVerificationSchema,
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
