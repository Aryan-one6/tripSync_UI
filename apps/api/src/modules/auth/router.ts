import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { authenticate } from '../../middleware/auth.js';
import {
  AadhaarVerificationSchema,
  AgencySignupSchema,
  LoginSchema,
  RefreshTokenSchema,
  TravelerSignupSchema,
  UpdateProfileSchema,
} from '@tripsync/shared';
import * as authService from './service.js';

export const authRouter = Router();

authRouter.post(
  '/signup/traveler',
  validate(TravelerSignupSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.signupTraveler(req.body);
    res.status(201).json({ data: result });
  }),
);

authRouter.post(
  '/signup/agency',
  validate(AgencySignupSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.signupAgency(req.body);
    res.status(201).json({ data: result });
  }),
);

authRouter.post(
  '/login',
  validate(LoginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.login(req.body.identifier, req.body.password);
    res.json({ data: result });
  }),
);

// POST /auth/refresh
authRouter.post(
  '/refresh',
  validate(RefreshTokenSchema),
  asyncHandler(async (req, res) => {
    const tokens = await authService.refreshTokens(req.body.refreshToken);
    res.json({ data: tokens });
  }),
);

// GET /auth/me
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.getProfile(req.userId!);
    res.json({ data: user });
  }),
);

// PATCH /auth/me
authRouter.patch(
  '/me',
  authenticate,
  validate(UpdateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await authService.updateProfile(req.userId!, req.body);
    res.json({ data: user });
  }),
);

authRouter.get(
  '/me/verification',
  authenticate,
  asyncHandler(async (req, res) => {
    const status = await authService.getVerificationStatus(req.userId!);
    res.json({ data: status });
  }),
);

authRouter.post(
  '/me/verification/aadhaar',
  authenticate,
  validate(AadhaarVerificationSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.verifyAadhaarForUser(req.userId!, req.body);
    res.json({ data: result });
  }),
);

/**
 * GET /auth/verify-email?token=<hex-token>
 * Verifies the user's email using the one-time token sent during signup.
 * Accessible without authentication (the token acts as the credential).
 */
authRouter.get(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const token = String(req.query['token'] ?? '');
    const result = await authService.verifyEmail(token);
    res.json({ data: result });
  }),
);

/**
 * POST /auth/resend-verification
 * Body: { email: string }
 * Sends a fresh verification email. Always returns 200 (no user enumeration).
 */
authRouter.post(
  '/resend-verification',
  asyncHandler(async (req, res) => {
    const email = String(req.body?.email ?? '');
    const result = await authService.resendVerificationEmail(email);
    res.json({ data: result });
  }),
);
