import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import { MockCapturePaymentSchema, VerifyPaymentSchema } from '@tripsync/shared';
import * as paymentService from './service.js';

export const paymentsRouter = Router();

paymentsRouter.get('/health', (_req, res) => {
  res.json({ module: 'payments', status: 'ok' });
});

paymentsRouter.get(
  '/my',
  authenticate,
  asyncHandler(async (req, res) => {
    const payments = await paymentService.listMyPayments(req.userId!);
    res.json({ data: payments });
  }),
);

paymentsRouter.get(
  '/groups/:groupId',
  authenticate,
  asyncHandler(async (req, res) => {
    const state = await paymentService.getGroupPaymentState(param(req.params.groupId), req.userId!);
    res.json({ data: state });
  }),
);

paymentsRouter.post(
  '/groups/:groupId/order',
  authenticate,
  asyncHandler(async (req, res) => {
    const order = await paymentService.createOrder(param(req.params.groupId), req.userId!);
    res.json({ data: order });
  }),
);

paymentsRouter.post(
  '/verify',
  authenticate,
  validate(VerifyPaymentSchema),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.verifyPayment(req.userId!, req.body);
    res.json({ data: payment });
  }),
);

paymentsRouter.post(
  '/mock-capture',
  authenticate,
  validate(MockCapturePaymentSchema),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.mockCapture(req.userId!, req.body);
    res.json({ data: payment });
  }),
);

export async function razorpayWebhookHandler(req: Request, res: Response) {
  const signature =
    typeof req.headers['x-razorpay-signature'] === 'string'
      ? req.headers['x-razorpay-signature']
      : undefined;

  const result = await paymentService.handleRazorpayWebhook(req.body as Buffer, signature);
  res.json({ data: result });
}
