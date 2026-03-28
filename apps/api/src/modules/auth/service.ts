import type {
  AadhaarVerificationInput,
  AgencySignupInput,
  LoginInput,
  SwitchRoleInput,
  TravelerSignupInput,
  UpdateProfileInput,
} from '@tripsync/shared';
import { prisma } from '../../lib/prisma.js';
import { sendOtp, verifyOtp } from './otp.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken, type TokenPayload } from './jwt.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../lib/errors.js';
import { performAadhaarKyc } from '../../lib/digilocker.js';
import { queueNotification } from '../../lib/queue.js';
import { env } from '../../lib/env.js';
import { syncUserVerificationTier } from '../../lib/verification.js';
import { hashPassword, verifyPassword } from './password.js';
import slugifyModule from 'slugify';

const slugify = (slugifyModule as any).default ?? slugifyModule;

export async function requestOtp(phone: string): Promise<void> {
  await sendOtp(phone);
}

type RequestedRole = Extract<TokenPayload['role'], 'user' | 'agency_admin'>;
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
  bio: true,
  verification: true,
  completedTrips: true,
  avgRating: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
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

async function loadUserWithAgency(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: safeUserSelect,
  });
}

function getAllowedRoles(user: { agency?: { id: string } | null }) {
  const roles: TokenPayload['role'][] = ['user'];
  if (user.agency?.id) {
    roles.push('agency_admin');
  }
  return roles;
}

function resolveRequestedRole(
  user: { agency?: { id: string } | null },
  requestedRole?: RequestedRole,
): RequestedRole {
  if (requestedRole === 'agency_admin') {
    if (!user.agency?.id) {
      throw new ForbiddenError('Agency account required');
    }
    return 'agency_admin';
  }

  return 'user';
}

function buildSessionPayload(user: SafeUser, role: RequestedRole) {
  const agencyId = role === 'agency_admin' ? user.agency?.id ?? null : null;
  const payload: TokenPayload = {
    userId: user.id,
    role,
    verification: user.verification,
    ...(agencyId ? { agencyId } : {}),
  };

  return {
    payload,
    agencyId,
  };
}

async function createSession(userId: string, requestedRole?: RequestedRole) {
  const user = await loadUserWithAgency(userId);
  if (!user) throw new NotFoundError('User');

  const role = resolveRequestedRole(user, requestedRole);
  const { payload, agencyId } = buildSessionPayload(user, role);

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
    availableRoles: getAllowedRoles(user),
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
    throw new ConflictError('Account already exists. Login instead.');
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

  const passwordHash = await hashPassword(data.password);

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
          bio: data.bio?.trim() || undefined,
          avatarUrl: data.avatarUrl,
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
          bio: data.bio?.trim() || undefined,
          avatarUrl: data.avatarUrl,
        },
        select: { id: true },
      });

  return {
    message: 'Traveler account created successfully. Please log in.',
  };
}

export async function signupAgency(data: AgencySignupInput) {
  const username = normalizeUsername(data.username);
  const email = normalizeEmail(data.email);
  const phone = normalizePhone(data.phone);

  const existingUser = await assertUserIdentityAvailable({ username, email, phone });

  const passwordHash = await hashPassword(data.password);

  const created = await prisma.$transaction(async (tx) => {
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
            bio: data.bio?.trim() || undefined,
            avatarUrl: data.avatarUrl,
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
            bio: data.bio?.trim() || undefined,
            avatarUrl: data.avatarUrl,
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
          gstin: data.gstin?.trim() || undefined,
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

  return {
    message: 'Agency account created successfully. Please log in.',
  };
}

export async function login(
  identifier: LoginInput['identifier'],
  password: LoginInput['password'],
  requestedRole?: RequestedRole,
) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
    },
    select: {
      id: true,
      passwordHash: true,
      isActive: true,
    },
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email, username, or password');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('User not found or inactive');
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email, username, or password');
  }

  return createSession(user.id, requestedRole);
}

export async function verifyOtpAndLogin(
  phone: string,
  otp: string,
  requestedRole?: RequestedRole,
) {
  const valid = await verifyOtp(phone, otp);
  if (!valid) {
    throw new UnauthorizedError('Invalid or expired OTP');
  }

  let user = await prisma.user.findUnique({ where: { phone } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        phone,
        fullName: `User_${phone.slice(-4)}`,
      },
    });
  }

  return createSession(user.id, requestedRole);
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

  const requestedRole: RequestedRole =
    payload.role === 'agency_admin' && user.agency?.id ? 'agency_admin' : 'user';

  return createSession(user.id, requestedRole);
}

export async function switchRole(userId: string, data: SwitchRoleInput) {
  return createSession(userId, data.role);
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
    },
  });
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
    throw new BadRequestError('TripSync verification requires an adult traveler profile');
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
    title: 'TripSync verification completed',
    body: `Your profile is now ${String(tier ?? updated.verification).toLowerCase()} on TripSync.`,
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
