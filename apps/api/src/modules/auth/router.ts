import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import { authenticate } from '../../middleware/auth.js';
import {
  AadhaarVerificationSchema,
  AgencySignupSchema,
  LoginSchema,
  RefreshTokenSchema,
  SendOtpSchema,
  SwitchRoleSchema,
  TravelerSignupSchema,
  UpdateProfileSchema,
  VerifyOtpSchema,
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
    const result = await authService.login(
      req.body.identifier,
      req.body.password,
      req.body.requestedRole,
    );
    res.json({ data: result });
  }),
);

// POST /auth/otp/send
authRouter.post(
  '/otp/send',
  validate(SendOtpSchema),
  asyncHandler(async (req, res) => {
    await authService.requestOtp(req.body.phone);
    res.json({ data: { message: 'OTP sent successfully' } });
  }),
);

// POST /auth/otp/verify
authRouter.post(
  '/otp/verify',
  validate(VerifyOtpSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.verifyOtpAndLogin(
      req.body.phone,
      req.body.otp,
      req.body.requestedRole,
    );
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

authRouter.post(
  '/switch-role',
  authenticate,
  validate(SwitchRoleSchema),
  asyncHandler(async (req, res) => {
    const session = await authService.switchRole(req.userId!, req.body);
    res.json({ data: session });
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
