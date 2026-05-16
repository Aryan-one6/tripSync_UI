import type {
  AadhaarVerificationInput,
  AgencySignupInput,
  LoginInput,
  TravelerSignupInput,
  UpdateProfileInput,
} from '@tripsync/shared';
import { prisma } from '../../lib/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from './jwt.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors.js';
import { performAadhaarKyc } from '../../lib/digilocker.js';
import { queueNotification } from '../../lib/queue.js';
import { env } from '../../lib/env.js';
import { syncUserVerificationTier } from '../../lib/verification.js';
import { hashPassword, verifyPassword } from './password.js';
import slugifyModule from 'slugify';
import { randomUUID, randomBytes } from 'crypto';
import { isValidGSTIN, assertGstinUnique, verifyGstinFromApi } from '../../lib/gst.js';
import {
  sendVerificationEmail,
  sendTravellerWelcomeEmail,
  sendAgencyWelcomeEmail,
} from '../../lib/email/index.js';

const slugify = (slugifyModule as any).default ?? slugifyModule;
type SafeAgency = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  verification: string;
  gstin: string | null;
  pan: string | null;
  tourismLicense: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  specializations: unknown;
  destinations: unknown;
  avgRating: number;
  totalReviews: number;
  totalTrips: number;
};
type SafeUser = {
  id: string;
  phone: string;
  username: string | null;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  city: string | null;
  travelPreferences: string | null;
  bio: string | null;
  verification: TokenPayload['verification'];
  completedTrips: number;
  avgRating: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  agency: SafeAgency | null;
};

const safeAgencySelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  description: true,
  verification: true,
  gstin: true,
  pan: true,
  tourismLicense: true,
  address: true,
  phone: true,
  email: true,
  city: true,
  state: true,
  specializations: true,
  destinations: true,
  avgRating: true,
  totalReviews: true,
  totalTrips: true,
} as const;

const safeUserSelect = {
  id: true,
  phone: true,
  username: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  dateOfBirth: true,
  gender: true,
  city: true,
  travelPreferences: true,
  bio: true,
  verification: true,
  completedTrips: true,
  avgRating: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  referralCode: true,   // exposed so user can share their referral link
  agency: {
    select: safeAgencySelect,
  },
} as const;

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string) {
  return phone.trim();
}

function generateAgencySlug(name: string): string {
  const base = (slugify(name, { lower: true, strict: true }) as string) || 'agency';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

/**
 * Generates a cryptographically secure email verification token
 * and its expiry timestamp (24 hours from now).
 */
function generateEmailVerificationToken(): { token: string; expiry: Date } {
  const token = randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return { token, expiry };
}

async function loadUserWithAgency(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });
}

function resolveAccountRole(user: { agency?: { id: string } | null }) {
  return user.agency?.id ? 'agency_admin' : 'user';
}

function buildSessionPayload(user: SafeUser) {
  const role = resolveAccountRole(user);
  const agencyId = role === 'agency_admin' ? user.agency?.id ?? null : null;
  const payload: TokenPayload = {
    userId: user.id,
    role,
    verification: user.verification,
    ...(agencyId ? { agencyId } : {}),
  };

  return {
    payload,
    role,
    agencyId,
  };
}

async function createSession(userId: string) {
  const user = await loadUserWithAgency(userId);
  if (!user) throw new NotFoundError('User');

  const { payload, role, agencyId } = buildSessionPayload(user);

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken(payload),
  ]);

  return {
    user,
    accessToken,
    refreshToken,
    role,
    agencyId,
  };
}

async function assertUserIdentityAvailable(input: {
  username: string;
  email: string;
  phone: string;
}) {
  const [usernameUser, emailUser, phoneUser] = await Promise.all([
    prisma.user.findUnique({
      where: { username: input.username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        agency: { select: { id: true } },
      },
    }),
    prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        agency: { select: { id: true } },
      },
    }),
    prisma.user.findUnique({
      where: { phone: input.phone },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        agency: { select: { id: true } },
      },
    }),
  ]);

  if (usernameUser) {
    throw new ConflictError('Username is already taken');
  }

  const matches = [emailUser, phoneUser].filter(
    (
      user,
    ): user is {
      id: string;
      username: string | null;
      passwordHash: string | null;
      agency: { id: string } | null;
    } => Boolean(user),
  );
  if (matches.length === 0) {
    return null;
  }

  const distinctUserIds = new Set(matches.map((user) => user.id));
  if (distinctUserIds.size > 1) {
    throw new ConflictError('Phone number and email belong to different accounts');
  }

  const existingUser = matches[0];
  if (existingUser.passwordHash) {
    throw new ConflictError(
      'An account already exists with this email or phone. Please log in instead.',
    );
  }

  if (existingUser.username) {
    throw new ConflictError('Account setup is partially complete. Contact support to recover it.');
  }

  return existingUser;
}

export async function signupTraveler(data: TravelerSignupInput) {
  const username = normalizeUsername(data.username);
  const email = normalizeEmail(data.email);
  const phone = normalizePhone(data.phone);

  const existingUser = await assertUserIdentityAvailable({ username, email, phone });

  // Validate referral code if provided — silently skip if invalid/expired (optional field)
  let inviterUserId: string | null = null;
  let referralLinkId: string | null = null;
  const referralCode = data.referralCode?.trim();
  if (referralCode) {
    try {
      const { assertValidReferralCodeFormat, validateReferralCode } = await import('../referrals/service.js');
      const normalizedCode = assertValidReferralCodeFormat(referralCode);
      const validatedReferral = await validateReferralCode(normalizedCode);

      if (validatedReferral) {
        inviterUserId = validatedReferral.referrerId;

        const existingLink = await prisma.referralLink.findUnique({
          where: { code: normalizedCode },
          select: { id: true },
        });
        referralLinkId = existingLink?.id ?? null;
      } else {
        // Invalid/expired referral code — log and continue without applying it
        console.warn(`[auth] Referral code "${referralCode}" is invalid or expired — skipping.`);
      }
    } catch (err) {
      // Format error or any other issue — skip referral silently
      console.warn(`[auth] Referral code "${referralCode}" could not be validated — skipping.`, err);
    }
  }

  const passwordHash = await hashPassword(data.password);
  const { token: verificationToken, expiry: verificationExpiry } = generateEmailVerificationToken();

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          fullName: data.fullName.trim(),
          username,
          email,
          phone,
          passwordHash,
          dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
          gender: data.gender,
          city: data.city.trim(),
          travelPreferences: data.travelPreferences.trim(),
          bio: data.bio?.trim() || undefined,
          avatarUrl: data.avatarUrl,
          referredByUserId: inviterUserId ?? undefined,
          // Reset verification token in case they are re-registering
          emailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry,
        },
        select: { id: true },
      })
    : await prisma.user.create({
        data: {
          fullName: data.fullName.trim(),
          username,
          email,
          phone,
          passwordHash,
          dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
          gender: data.gender,
          city: data.city.trim(),
          travelPreferences: data.travelPreferences.trim(),
          bio: data.bio?.trim() || undefined,
          avatarUrl: data.avatarUrl,
          referredByUserId: inviterUserId ?? undefined,
          emailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry,
        },
        select: { id: true },
      });

  if (inviterUserId) {
    const { registerReferralInvite } = await import('../referrals/service.js');
    await registerReferralInvite({
      referrerId: inviterUserId,
      referredUserId: user.id,
      referredEmail: email,
      referralLinkId: referralLinkId ?? undefined,
    });
  }

  const { getOrCreateReferralLink } = await import('../referrals/service.js');
  await getOrCreateReferralLink(user.id);

  // Referral bonus credits are granted in updateProfile() after profile completion.

  // ─── Send emails (non-blocking – do not fail signup on email errors) ────────
  const emailRecipient = email;
  const fullName = data.fullName.trim();

  Promise.allSettled([
    sendVerificationEmail({ to: emailRecipient, fullName, verificationToken }),
    sendTravellerWelcomeEmail({ to: emailRecipient, fullName }),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[auth] Traveller signup email #${i + 1} failed:`, r.reason);
      }
    });
  });

  return {
    message:
      'Traveler account created successfully. Please check your email to verify your address.',
  };
}


export async function signupAgency(data: AgencySignupInput) {
  const username = normalizeUsername(data.username);
  const email = normalizeEmail(data.email);
  const phone = normalizePhone(data.phone);

  const existingUser = await assertUserIdentityAvailable({ username, email, phone });

  const passwordHash = await hashPassword(data.password);

  // ─── GST Verification for agency signup ─────────────────────────────────
  let gstVerifiedName: string | null = null;
  let gstVerifiedAt: Date | null = null;
  const normalizedGstin = data.gstin?.toUpperCase().trim() || null;

  if (normalizedGstin) {
    if (!isValidGSTIN(normalizedGstin)) {
      throw new BadRequestError(
        `Invalid GSTIN format: ${normalizedGstin}. Expected 15-character Indian GSTIN (e.g. 27AADCB2230M1ZT).`,
      );
    }

    // Check uniqueness — throws ConflictError if already registered
    await assertGstinUnique(normalizedGstin);

    // Verify via public GST API
    const gstResult = await verifyGstinFromApi(normalizedGstin);
    if (gstResult.verified) {
      gstVerifiedName = gstResult.tradeName || gstResult.legalName;
      gstVerifiedAt = new Date();
    }

    if (gstResult.status === 'Cancelled' || gstResult.status === 'Suspended') {
      throw new BadRequestError(
        `GSTIN ${normalizedGstin} has status "${gstResult.status}". Only active GSTINs are accepted.`,
      );
    }
  }

  const { token: verificationToken, expiry: verificationExpiry } = generateEmailVerificationToken();

  const user = await prisma.$transaction(async (tx) => {
    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            fullName: data.fullName.trim(),
            username,
            email,
            phone,
            passwordHash,
            dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
            gender: data.gender,
            city: data.city.trim(),
            travelPreferences: data.travelPreferences.trim(),
            bio: data.bio?.trim() || undefined,
            avatarUrl: data.avatarUrl,
            // Reset email verification for re-registering users
            emailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpiry: verificationExpiry,
          },
          select: { id: true },
        })
      : await tx.user.create({
          data: {
            fullName: data.fullName.trim(),
            username,
            email,
            phone,
            passwordHash,
            dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
            gender: data.gender,
            city: data.city.trim(),
            travelPreferences: data.travelPreferences.trim(),
            bio: data.bio?.trim() || undefined,
            avatarUrl: data.avatarUrl,
            emailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpiry: verificationExpiry,
          },
          select: { id: true },
        });

    if (existingUser?.agency?.id) {
      await tx.agency.update({
        where: { id: existingUser.agency.id },
        data: {
          name: data.agencyName.trim(),
          description: data.agencyDescription.trim(),
          phone: data.agencyPhone ? normalizePhone(data.agencyPhone) : phone,
          email: data.agencyEmail ? normalizeEmail(data.agencyEmail) : email,
          address: data.agencyAddress.trim(),
          city: data.agencyCity.trim(),
          state: data.agencyState.trim(),
          gstin: data.gstin?.trim() || undefined,
          pan: data.pan?.trim() || undefined,
          tourismLicense: data.tourismLicense?.trim() || undefined,
          specializations: data.specializations,
          destinations: data.destinations,
        },
        select: { id: true },
      });
    } else {
      await tx.agency.create({
        data: {
          ownerId: user.id,
          name: data.agencyName.trim(),
          slug: generateAgencySlug(data.agencyName),
          description: data.agencyDescription.trim(),
          phone: data.agencyPhone ? normalizePhone(data.agencyPhone) : phone,
          email: data.agencyEmail ? normalizeEmail(data.agencyEmail) : email,
          address: data.agencyAddress.trim(),
          city: data.agencyCity.trim(),
          state: data.agencyState.trim(),
          gstin: normalizedGstin || undefined,
          gstVerifiedName: gstVerifiedName || undefined,
          gstVerifiedAt: gstVerifiedAt || undefined,
          pan: data.pan?.trim() || undefined,
          tourismLicense: data.tourismLicense?.trim() || undefined,
          specializations: data.specializations,
          destinations: data.destinations,
        },
        select: { id: true },
      });
    }

    return user;
  });

  const { getOrCreateReferralLink } = await import('../referrals/service.js');
  await getOrCreateReferralLink(user.id);

  // ─── Send emails (non-blocking – do not fail signup on email errors) ────────
  const agencyEmail = data.agencyEmail ? normalizeEmail(data.agencyEmail) : email;
  const fullName = data.fullName.trim();
  const agencyName = data.agencyName.trim();

  Promise.allSettled([
    sendVerificationEmail({ to: agencyEmail, fullName, verificationToken }),
    sendAgencyWelcomeEmail({ to: agencyEmail, fullName, agencyName }),
  ]).then((results) => {
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.error(`[auth] Agency signup email #${i + 1} failed:`, r.reason);
      }
    });
  });

  return {
    message:
      'Agency account created successfully. Please check your email to verify your address.',
  };
}

export async function login(
  identifier: LoginInput['identifier'],
  password: LoginInput['password'],
) {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) {
    throw new UnauthorizedError('Email or username is required');
  }

  const looksLikePhone = /^[6-9]\d{9}$/.test(normalizedIdentifier);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: { equals: normalizedIdentifier.toLowerCase(), mode: 'insensitive' } },
        { username: { equals: normalizedIdentifier.toLowerCase(), mode: 'insensitive' } },
        ...(looksLikePhone ? [{ phone: normalizedIdentifier }] : []),
      ],
    },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
      email: true,
      username: true,
      phone: true,
      emailVerified: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('No account found for this email/username');
  }

  if (!user.passwordHash) {
    throw new UnauthorizedError('This account has no password set. Please reset password.');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  // ─── Email verification gate ───────────────────────────────────────────────
  // Only enforce verification for accounts created AFTER email verification
  // was introduced (i.e., those that have a token or are already marked as
  // needing verification). Users who registered before this feature have
  // emailVerified = false but no token → let them through.
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true, emailVerificationToken: true },
  });
  if (fullUser && !fullUser.emailVerified && fullUser.emailVerificationToken !== null) {
    throw new UnauthorizedError(
      'Please verify your email address before logging in. Check your inbox for the verification link.',
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Incorrect password');
  }

  return createSession(user.id);
}

export async function refreshTokens(token: string) {
  const payload = await verifyRefreshToken(token);
  if (!payload) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await loadUserWithAgency(payload.userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  return createSession(user.id);
}

/**
 * Verifies an email address using a one-time token.
 * Marks the user's email as verified and clears the token fields.
 */
export async function verifyEmail(token: string): Promise<{ message: string }> {
  if (!token || token.length < 10) {
    throw new BadRequestError('Invalid verification token');
  }

  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
    select: {
      id: true,
      emailVerified: true,
      emailVerificationExpiry: true,
    },
  });

  if (!user) {
    throw new BadRequestError('Verification token is invalid or has already been used.');
  }

  if (user.emailVerified) {
    return { message: 'Email is already verified. You can now log in.' };
  }

  // Check expiry
  if (!user.emailVerificationExpiry || user.emailVerificationExpiry < new Date()) {
    throw new BadRequestError(
      'Verification link has expired. Please sign up again to receive a new one.',
    );
  }

  // Mark as verified and clear token fields
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    },
  });

  return { message: 'Email verified successfully. You can now log in.' };
}

/**
 * Re-sends the verification email to a user who hasn't verified yet.
 * Always returns a generic success message to avoid leaking user existence.
 */
export async function resendVerificationEmail(email: string): Promise<{ message: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      fullName: true,
      emailVerified: true,
    },
  });

  // Always return success to avoid revealing whether the email is registered
  if (!user || user.emailVerified) {
    return { message: 'If that email is registered and unverified, a new link has been sent.' };
  }

  const { token: verificationToken, expiry: verificationExpiry } = generateEmailVerificationToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verificationToken,
      emailVerificationExpiry: verificationExpiry,
    },
  });

  // Attempt send before returning so resend behavior is deterministic.
  // We still keep a generic outward response to avoid user enumeration.
  try {
    await sendVerificationEmail({
      to: normalizedEmail,
      fullName: user.fullName,
      verificationToken,
    });
  } catch (err) {
    console.error('[auth] resendVerificationEmail failed:', err);
  }

  return { message: 'If that email is registered and unverified, a new link has been sent.' };
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      travelPreferences: data.travelPreferences?.trim(),
    },
    select: safeUserSelect,
  });

  // After profile update, if user has a referrer and hasn't been credited yet, complete the referral
  const updatedUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      referredByUserId: true,
      referralBonusPaid: true,
    },
  });

  if (updatedUser?.referredByUserId && !updatedUser.referralBonusPaid) {
    try {
      // Dynamically import to avoid circular dependencies
      const { completeReferral } = await import('../referrals/service.js');
      await completeReferral(updatedUser.referredByUserId, userId);

      // Mark bonus as paid
      await prisma.user.update({
        where: { id: userId },
        data: { referralBonusPaid: true },
      });
    } catch (err) {
      console.error('[auth] Failed to complete referral on profile update', err);
      // Don't fail the profile update if referral completion fails
    }
  }

  return user;
}

function isAdult(dateOfBirth: Date) {
  const ageMs = Date.now() - dateOfBirth.getTime();
  const ageDate = new Date(ageMs);
  return Math.abs(ageDate.getUTCFullYear() - 1970) >= 18;
}

export async function getVerificationStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      agency: {
        select: {
          id: true,
          name: true,
          slug: true,
          verification: true,
        },
      },
    },
  });

  if (!user) throw new NotFoundError('User');

  return {
    tier: user.verification,
    hasAadhaar: Boolean(user.aadhaarHash),
    completedTrips: user.completedTrips,
    avgRating: user.avgRating,
    trustedEligible:
      Boolean(user.aadhaarHash) && user.completedTrips >= 3 && user.avgRating >= 4.5,
    agency: user.agency,
  };
}

export async function verifyAadhaarForUser(
  userId: string,
  data: AadhaarVerificationInput,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      phone: true,
      verification: true,
    },
  });
  if (!user) throw new NotFoundError('User');

  const dateOfBirth = new Date(`${data.dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(dateOfBirth.getTime())) {
    throw new BadRequestError('Invalid date of birth');
  }
  if (!isAdult(dateOfBirth)) {
    throw new BadRequestError('TravellersIn verification requires an adult traveler profile');
  }

  const result = await performAadhaarKyc({
    aadhaarNumber: data.aadhaarNumber,
    fullName: data.fullName,
    dateOfBirth: data.dateOfBirth,
  });

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: data.fullName,
      dateOfBirth,
      aadhaarHash: result.aadhaarHash,
    },
    include: {
      agency: {
        select: {
          id: true,
          name: true,
          slug: true,
          verification: true,
        },
      },
    },
  });

  const tier = await syncUserVerificationTier(userId);

  await queueNotification({
    type: 'aadhaar_verified',
    title: 'TravellersIn verification completed',
    body: `Your profile is now ${String(tier ?? updated.verification).toLowerCase()} on TravellersIn.`,
    userIds: [userId],
    phoneNumbers: [user.phone],
    ctaUrl: `${env.FRONTEND_URL}/dashboard/settings`,
    metadata: {
      provider: result.provider,
      maskedAadhaar: result.maskedAadhaar,
    },
  });

  return {
    tier: tier ?? updated.verification,
    provider: result.provider,
    maskedAadhaar: result.maskedAadhaar,
    fullName: updated.fullName,
    dateOfBirth: updated.dateOfBirth?.toISOString() ?? null,
    agency: updated.agency,
  };
}
