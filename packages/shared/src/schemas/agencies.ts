import { z } from 'zod';

export const RegisterAgencySchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  logoUrl: z.string().url().optional(),
  gstin: z.string().min(5).max(20),
  pan: z.string().max(20).optional(),
  tourismLicense: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  phone: z.string().max(15).optional(),
  email: z.string().email().optional(),
  specializations: z.array(z.string()).optional(),
  destinations: z.array(z.string()).optional(),
});

export const UpdateAgencySchema = RegisterAgencySchema.partial();

export const SubmitAgencyVerificationSchema = z.object({
  gstin: z.string().max(20).optional(),
  pan: z.string().max(20).optional(),
  tourismLicense: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  phone: z.string().max(15).optional(),
  email: z.string().email().optional(),
  description: z.string().max(2000).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Agency verification consent is required' }),
  }),
});

export const BrowseAgenciesSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  specialization: z.string().optional(),
  destination: z.string().optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type RegisterAgencyInput = z.infer<typeof RegisterAgencySchema>;
export type UpdateAgencyInput = z.infer<typeof UpdateAgencySchema>;
export type SubmitAgencyVerificationInput = z.infer<typeof SubmitAgencyVerificationSchema>;
