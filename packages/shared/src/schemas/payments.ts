import { z } from 'zod';

export const VerifyPaymentSchema = z.object({
  paymentId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const MockCapturePaymentSchema = z.object({
  paymentId: z.string().uuid(),
});

export const CreateOrderSchema = z.object({
  pointsToRedeem: z.number().int().min(0).optional().default(0),
  walletAmountToUse: z.number().int().min(0).max(200000).optional().default(0),
  promoCode: z.string().trim().max(30).optional(),
});

export const ValidatePromoCodeSchema = z.object({
  code: z.string().trim().min(1).max(30),
  groupId: z.string().uuid(),
});

export const ResolveConfirmingWindowSchema = z.object({
  groupId: z.string().uuid(),
});

export const ReconcilePaymentsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const CreateDisputeSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
});

export const ResolveDisputeSchema = z.object({
  resolution: z.enum(['USER_FAVOR', 'AGENCY_FAVOR', 'SPLIT', 'REJECT']),
  notes: z.string().max(2000).optional(),
});

export const AdminPaymentMapSchema = z.object({
  agencyId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  packageId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED']).optional(),
  escrowStatus: z.enum(['HELD', 'PARTIAL_RELEASE', 'RELEASED', 'REFUNDED']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
});

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
export type MockCapturePaymentInput = z.infer<typeof MockCapturePaymentSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type ResolveConfirmingWindowInput = z.infer<typeof ResolveConfirmingWindowSchema>;
export type ReconcilePaymentsInput = z.infer<typeof ReconcilePaymentsSchema>;
export type CreateDisputeInput = z.infer<typeof CreateDisputeSchema>;
export type ResolveDisputeInput = z.infer<typeof ResolveDisputeSchema>;
export type AdminPaymentMapInput = z.infer<typeof AdminPaymentMapSchema>;
export type ValidatePromoCodeInput = z.infer<typeof ValidatePromoCodeSchema>;
