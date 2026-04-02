import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import { CreateOfferSchema, CounterOfferSchema } from '@tripsync/shared';
import * as offerService from './service.js';

export const offersRouter = Router();

offersRouter.get(
  '/my',
  authenticate,
  asyncHandler(async (req, res) => {
    const offers = await offerService.listAgencyOffers(req.userId!);
    res.json({ data: offers });
  }),
);

offersRouter.post(
  '/',
  authenticate,
  validate(CreateOfferSchema),
  asyncHandler(async (req, res) => {
    const offer = await offerService.submitOffer(req.userId!, req.body);
    res.status(201).json({ data: offer });
  }),
);

offersRouter.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const offer = await offerService.getById(param(req.params.id), req.userId!);
    res.json({ data: offer });
  }),
);

offersRouter.post(
  '/:id/counter',
  authenticate,
  validate(CounterOfferSchema),
  asyncHandler(async (req, res) => {
    const negotiation = await offerService.counterOffer(param(req.params.id), req.userId!, req.body);
    res.json({ data: negotiation });
  }),
);

offersRouter.post(
  '/:id/accept',
  authenticate,
  asyncHandler(async (req, res) => {
    const offer = await offerService.accept(param(req.params.id), req.userId!);
    res.json({ data: offer });
  }),
);

offersRouter.post(
  '/:id/reject',
  authenticate,
  asyncHandler(async (req, res) => {
    const offer = await offerService.reject(param(req.params.id), req.userId!);
    res.json({ data: offer });
  }),
);

offersRouter.post(
  '/:id/withdraw',
  authenticate,
  asyncHandler(async (req, res) => {
    const offer = await offerService.withdraw(param(req.params.id), req.userId!);
    res.json({ data: offer });
  }),
);
