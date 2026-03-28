import { Router } from 'express';
import { authenticate, agencyOnly } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import { CreatePackageSchema, UpdatePackageSchema } from '@tripsync/shared';
import * as packageService from './service.js';

export const packagesRouter = Router();

packagesRouter.post(
  '/',
  authenticate,
  agencyOnly,
  validate(CreatePackageSchema),
  asyncHandler(async (req, res) => {
    const pkg = await packageService.create(req.userId!, req.body);
    res.status(201).json({ data: pkg });
  }),
);

packagesRouter.get(
  '/slug/:slug',
  asyncHandler(async (req, res) => {
    const pkg = await packageService.getBySlug(param(req.params.slug));
    res.json({ data: pkg });
  }),
);

packagesRouter.get(
  '/my',
  authenticate,
  agencyOnly,
  asyncHandler(async (req, res) => {
    const packages = await packageService.listAgencyPackages(req.userId!);
    res.json({ data: packages });
  }),
);

packagesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const pkg = await packageService.getById(param(req.params.id));
    res.json({ data: pkg });
  }),
);

packagesRouter.patch(
  '/:id',
  authenticate,
  agencyOnly,
  validate(UpdatePackageSchema),
  asyncHandler(async (req, res) => {
    const pkg = await packageService.update(param(req.params.id), req.userId!, req.body);
    res.json({ data: pkg });
  }),
);

packagesRouter.post(
  '/:id/publish',
  authenticate,
  agencyOnly,
  asyncHandler(async (req, res) => {
    const pkg = await packageService.publish(param(req.params.id), req.userId!);
    res.json({ data: pkg });
  }),
);
