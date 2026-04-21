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

export const AgencyMemberRoleSchema = z.enum(['ADMIN', 'MANAGER', 'AGENT', 'FINANCE']);

export const InviteAgencyMemberSchema = z.object({
  userId: z.string().uuid(),
  role: AgencyMemberRoleSchema.default('AGENT'),
});

export const UpdateAgencyMemberSchema = z.object({
  role: AgencyMemberRoleSchema.optional(),
  isActive: z.boolean().optional(),
});

// ─── Real-time GST Verification ─────────────────────────────────────────────────────

export const VerifyGstinQuerySchema = z.object({
  gstin: z.string().min(3).max(20),
});

// ─── Bank Account Verification ───────────────────────────────────────────────────

export const BankVerificationSchema = z.object({
  accountNumber: z
    .string()
    .min(9, 'Account number too short')
    .max(18, 'Account number too long')
    .regex(/^\d+$/, 'Account number must contain only digits'),
  ifscCode: z
    .string()
    .length(11, 'IFSC code must be exactly 11 characters')
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format'),
  accountHolderName: z
    .string()
    .min(2, 'Account holder name is required')
    .max(100),
  bankName: z.string().max(100).optional(),
  branchName: z.string().max(100).optional(),
});

// ─── KYC Document Vault ───────────────────────────────────────────────────────────

const KYC_DOC_TYPES = ['PAN_CARD', 'CANCELLED_CHEQUE', 'GST_CERTIFICATE', 'TOURISM_LICENSE', 'OTHER'] as const;

export const KycDocumentUploadSchema = z.object({
  docType: z.enum(KYC_DOC_TYPES),
  // s3Key is the private S3 object key from a presigned upload URL flow
  s3Key: z.string().min(1).max(500),
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
});

export type RegisterAgencyInput = z.infer<typeof RegisterAgencySchema>;
export type UpdateAgencyInput = z.infer<typeof UpdateAgencySchema>;
export type SubmitAgencyVerificationInput = z.infer<typeof SubmitAgencyVerificationSchema>;
export type InviteAgencyMemberInput = z.infer<typeof InviteAgencyMemberSchema>;
export type UpdateAgencyMemberInput = z.infer<typeof UpdateAgencyMemberSchema>;
export type VerifyGstinQueryInput = z.infer<typeof VerifyGstinQuerySchema>;
export type BankVerificationInput = z.infer<typeof BankVerificationSchema>;
export type KycDocumentUploadInput = z.infer<typeof KycDocumentUploadSchema>;
