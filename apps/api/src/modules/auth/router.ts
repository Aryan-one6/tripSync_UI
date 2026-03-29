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
    const result = await authService.login(req.body.email, req.body.password);
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
