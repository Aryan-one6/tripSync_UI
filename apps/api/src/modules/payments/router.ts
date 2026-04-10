import { Router } from 'express';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { param } from '../../lib/helpers.js';
import {
  MockCapturePaymentSchema,
  VerifyPaymentSchema,
  ResolveConfirmingWindowSchema,
  ReconcilePaymentsSchema,
  CreateDisputeSchema,
  ResolveDisputeSchema,
} from '@tripsync/shared';
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
  '/wallet/summary',
  authenticate,
  asyncHandler(async (req, res) => {
    const wallet = await paymentService.getAgencyWalletSummary(req.userId!);
    res.json({ data: wallet });
  }),
);

paymentsRouter.get(
  '/wallet/transactions',
  authenticate,
  asyncHandler(async (req, res) => {
    const transactions = await paymentService.listAgencyTransactions(req.userId!);
    res.json({ data: transactions });
  }),
);

paymentsRouter.get(
  '/invoices',
  authenticate,
  asyncHandler(async (req, res) => {
    const invoices = await paymentService.listInvoicesForUser(req.userId!);
    res.json({ data: invoices });
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

paymentsRouter.post(
  '/confirming-window/resolve',
  authenticate,
  authorize('platform_admin'),
  validate(ResolveConfirmingWindowSchema),
  asyncHandler(async (req, res) => {
    const result = await paymentService.resolveConfirmingWindow(req.body.groupId, 'manual');
    res.json({ data: result });
  }),
);

paymentsRouter.post(
  '/reconcile',
  authenticate,
  authorize('platform_admin'),
  validateQuery(ReconcilePaymentsSchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as z.infer<typeof ReconcilePaymentsSchema>;
    const result = await paymentService.reconcilePendingPayments(query.limit);
    res.json({ data: result });
  }),
);

paymentsRouter.post(
  '/disputes',
  authenticate,
  validate(CreateDisputeSchema),
  asyncHandler(async (req, res) => {
    const dispute = await paymentService.createDispute(req.userId!, req.body);
    res.status(201).json({ data: dispute });
  }),
);

paymentsRouter.get(
  '/disputes',
  authenticate,
  asyncHandler(async (req, res) => {
    const disputes = await paymentService.listDisputesForAgency(req.userId!);
    res.json({ data: disputes });
  }),
);

paymentsRouter.post(
  '/disputes/:id/resolve',
  authenticate,
  authorize('platform_admin'),
  validate(ResolveDisputeSchema),
  asyncHandler(async (req, res) => {
    const dispute = await paymentService.resolveDispute(req.userId!, param(req.params.id), req.body);
    res.json({ data: dispute });
  }),
);

// POST /payments/groups/:groupId/complete
// Called by admin or agency when a trip finishes successfully.
// Releases final escrow tranche and grants loyalty bonus to all members.
paymentsRouter.post(
  '/groups/:groupId/complete',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await paymentService.completeTrip(
      param(req.params.groupId),
      req.userId!,
    );
    res.json({ data: result });
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
