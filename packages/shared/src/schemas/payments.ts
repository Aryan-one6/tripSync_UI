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

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;
export type MockCapturePaymentInput = z.infer<typeof MockCapturePaymentSchema>;
