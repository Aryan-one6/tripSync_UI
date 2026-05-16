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

function normalizeSecretCandidates(input: string): string[] {
  const candidates = new Set<string>();
  const raw = input.trim();
  if (!raw) return [];

  candidates.add(raw);
  candidates.add(raw.replace(/ /g, '+'));

  try {
    const decoded = decodeURIComponent(raw);
    candidates.add(decoded);
    candidates.add(decoded.replace(/ /g, '+'));
  } catch {
    // Ignore invalid percent-encoding and continue with raw candidates.
  }

  return [...candidates];
}

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

/**
 * GET /auth/smtp-test?to=you@example.com&secret=<SMTP_TEST_SECRET>
 * Sends a test email to verify SMTP connectivity on production.
 * Protected by a shared secret (query param or x-smtp-test-secret header).
 * Remove or disable after testing.
 */
authRouter.get(
  '/smtp-test',
  asyncHandler(async (req, res) => {
    const querySecret = String(req.query['secret'] ?? '');
    const headerSecretValue = req.header('x-smtp-test-secret') ?? '';
    const providedSecret = headerSecretValue || querySecret;
    const expectedSecret = String(process.env['SMTP_TEST_SECRET'] ?? '').trim();
    const to = String(req.query['to'] ?? '');

    if (!expectedSecret) {
      res.status(500).json({ error: 'SMTP_TEST_SECRET is not configured on server' });
      return;
    }

    const matches = normalizeSecretCandidates(providedSecret).includes(expectedSecret);
    if (!matches) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    if (!to || !to.includes('@')) {
      res.status(400).json({ error: 'Provide a valid ?to= email address' });
      return;
    }

    const { sendEmail } = await import('../../lib/email/index.js');
    try {
      await sendEmail({
        to,
        subject: '[TripSync] SMTP Test Email',
        html: `<p>SMTP is working ✅</p><p>Host: <strong>${process.env['ZOHO_SMTP_HOST']}</strong></p><p>From: <strong>${process.env['ZOHO_EMAIL']}</strong></p>`,
        text: `SMTP is working. Host: ${process.env['ZOHO_SMTP_HOST']}. From: ${process.env['ZOHO_EMAIL']}.`,
      });
      res.json({ data: { ok: true, message: `Test email sent to ${to}` } });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'SMTP send failed' });
    }
  }),
);
