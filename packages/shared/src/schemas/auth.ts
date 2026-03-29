import { z } from 'zod';

const genderSchema = z.enum(['male', 'female', 'other']);
const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(24, 'Username must be at most 24 characters')
  .regex(/^[a-z0-9_]+$/, 'Username can only use lowercase letters, numbers, and underscores');
const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number');
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');
const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format');

export const LoginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: passwordSchema,
});

const baseSignupSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  username: usernameSchema,
  email: z.string().trim().email(),
  phone: phoneSchema,
  password: passwordSchema,
  dateOfBirth: dateOfBirthSchema,
  gender: genderSchema,
  city: z.string().trim().min(2).max(100),
  travelPreferences: z.string().trim().min(10).max(500),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export const TravelerSignupSchema = baseSignupSchema;

export const AgencySignupSchema = baseSignupSchema.extend({
  agencyName: z.string().trim().min(2).max(120),
  agencyDescription: z.string().trim().min(20).max(1200),
  agencyPhone: phoneSchema.optional(),
  agencyEmail: z.string().trim().email().optional(),
  agencyAddress: z.string().trim().min(5).max(300),
  agencyCity: z.string().trim().min(2).max(100),
  agencyState: z.string().trim().min(2).max(100),
  gstin: z.string().trim().min(5).max(30),
  pan: z.string().trim().max(30).optional(),
  tourismLicense: z.string().trim().max(80).optional(),
  specializations: z.array(z.string().trim().min(2).max(60)).min(1).max(8),
  destinations: z.array(z.string().trim().min(2).max(60)).min(1).max(12),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  avatarUrl: z.string().url().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: genderSchema.optional(),
  city: z.string().max(100).optional(),
  travelPreferences: z.string().trim().min(10).max(500).optional(),
  bio: z.string().max(500).optional(),
});

export const AadhaarVerificationSchema = z.object({
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar number must be 12 digits'),
  fullName: z.string().min(2).max(100),
  dateOfBirth: dateOfBirthSchema,
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Aadhaar consent is required for verification' }),
  }),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type TravelerSignupInput = z.infer<typeof TravelerSignupSchema>;
export type AgencySignupInput = z.infer<typeof AgencySignupSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type AadhaarVerificationInput = z.infer<typeof AadhaarVerificationSchema>;
