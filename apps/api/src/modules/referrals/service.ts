import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors.js';
import * as walletService from '../wallet/service.js';
import { emitUserEvent } from '../../lib/socket.js';

export async function referToAgencies(planId: string, userId: string, agencyIds: string[]) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Plan');
  if (plan.creatorId !== userId) throw new ForbiddenError('Only the creator can refer');
  if (plan.status !== 'OPEN') throw new BadRequestError('Plan must be OPEN to refer agencies');

  // Verify all agencies exist
  const agencies = await prisma.agency.findMany({
    where: { id: { in: agencyIds }, isActive: true },
  });

  if (agencies.length !== agencyIds.length) {
    throw new BadRequestError('One or more agencies not found');
  }

  // Create referred offers (placeholder offers marked as referred)
  const operations = agencies.map((agency) =>
    prisma.offer.upsert({
      where: { planId_agencyId: { planId, agencyId: agency.id } },
      create: {
        planId,
        agencyId: agency.id,
        pricePerPerson: 0, // agency will fill in
        isReferred: true,
        referredAt: new Date(),
        status: 'PENDING',
      },
      update: {
        isReferred: true,
        referredAt: new Date(),
      },
    }),
  );

  await prisma.$transaction(operations);

  return { referredCount: agencies.length };
}

export async function getAgencyReferrals(userId: string) {
  const agency = await prisma.agency.findUnique({ where: { ownerId: userId } });
  if (!agency) throw new ForbiddenError('Agency access required');

  return prisma.offer.findMany({
    where: {
      agencyId: agency.id,
      isReferred: true,
    },
    include: {
      plan: {
        select: {
          id: true, title: true, destination: true, startDate: true, endDate: true,
          budgetMin: true, budgetMax: true, groupSizeMin: true, groupSizeMax: true,
          vibes: true,
          creator: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { referredAt: 'desc' },
  });
}

// ─── User-to-User Referral System ───────────────────────────────────────────

export const REFERRER_BONUS_RUPEES = 250;
export const REFERRED_BONUS_RUPEES = 150;
export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_LINK_EXPIRY_DAYS = 90;
export const REFERRAL_CODE_REGEX = /^[A-Z0-9]{6,8}$/;

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}

export function assertValidReferralCodeFormat(code: string): string {
  const normalizedCode = normalizeReferralCode(code);
  if (!REFERRAL_CODE_REGEX.test(normalizedCode)) {
    throw new BadRequestError('Referral code must be 6-8 alphanumeric characters');
  }
  return normalizedCode;
}

/**
 * Generate a unique alphanumeric referral code (e.g., "TS8A2XK9")
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'TS'; // TripSync prefix
  for (let i = 0; i < REFERRAL_CODE_LENGTH - 2; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a referral code that doesn't already exist
 */
async function generateUniqueReferralCode(): Promise<string> {
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    code = generateReferralCode();
    const exists = await prisma.referralLink.findUnique({
      where: { code },
    });
    if (!exists) break;
    attempts++;
  } while (attempts < maxAttempts);

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique referral code after 10 attempts');
  }

  return code;
}

/**
 * Generate a new referral link for a user.
 * Returns the code and a shareable URL.
 */
export async function generateReferralLink(userId: string) {
  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Generate unique code
  const code = await generateUniqueReferralCode();

  // Calculate expiry (90 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFERRAL_LINK_EXPIRY_DAYS);

  // Create referral link
  const link = await prisma.referralLink.create({
    data: {
      userId,
      code,
      expiresAt,
    },
  });

  // Build shareable URL
  const webUrl = process.env.WEB_URL || 'https://tripsync.app';
  const shareUrl = `${webUrl}/signup?ref=${code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;

  return {
    id: link.id,
    code,
    shareUrl,
    qrUrl,
    expiresAt: link.expiresAt,
  };
}

/**
 * Validate a referral code and return referrer info if valid.
 * Called during signup.
 */
export async function validateReferralCode(
  code: string,
): Promise<{ referrerId: string; referrerEmail: string | null } | null> {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const normalizedCode = normalizeReferralCode(code);
  if (!REFERRAL_CODE_REGEX.test(normalizedCode)) {
    return null;
  }

  const now = new Date();

  const link = await prisma.referralLink.findUnique({
    where: { code: normalizedCode },
    include: {
      user: {
        select: { id: true, email: true },
      },
    },
  });

  // Not found, expired, or already used
  if (!link) return null;
  if (link.expiresAt < now) return null;
  if (link.usedAt !== null) return null;

  return {
    referrerId: link.user.id,
    referrerEmail: link.user.email,
  };
}

export async function registerReferralInvite(input: {
  referrerId: string;
  referredUserId: string;
  referredEmail?: string | null;
  referralLinkId?: string;
}): Promise<void> {
  const referrerId = input.referrerId;
  const referredUserId = input.referredUserId;

  if (referrerId === referredUserId) {
    throw new BadRequestError('You cannot use your own referral code');
  }

  const inviteResult = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const idempotencyKey = `referral_invite:${referrerId}:${referredUserId}`;

    const existing = await tx.referralTransaction.findUnique({
      where: {
        referrerId_referredUserId: {
          referrerId,
          referredUserId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    const referralTx = existing
      ? existing
      : await tx.referralTransaction.create({
          data: {
            referrerId,
            referredUserId,
            status: 'INVITED',
            idempotencyKey,
            referrerAmount: REFERRER_BONUS_RUPEES * 100,
            referredAmount: REFERRED_BONUS_RUPEES * 100,
          },
          select: {
            id: true,
            status: true,
          },
        });

    if (input.referralLinkId) {
      await tx.referralLink.updateMany({
        where: {
          id: input.referralLinkId,
          userId: referrerId,
          usedByUserId: null,
          expiresAt: { gt: now },
        },
        data: {
          usedByUserId: referredUserId,
        },
      });
    }

    return {
      referralTransactionId: referralTx.id,
      status: referralTx.status,
      isNewInvite: !existing && referralTx.status === 'INVITED',
    };
  });

  if (!inviteResult.isNewInvite) {
    return;
  }

  emitUserEvent(referrerId, 'referral:new-invite', {
    referralId: inviteResult.referralTransactionId,
    referrerId,
    referredUserId,
    referredEmail: input.referredEmail ?? null,
    status: inviteResult.status,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Mark a referral code as used and complete the referral transaction.
 * Called after a new user successfully completes signup (email verified + profile done).
 *
 * Credits both referrer and referred user with wallet bonuses.
 */
export async function completeReferral(referrerId: string, referredUserId: string): Promise<void> {
  const idempotencyKey = `referral_complete:${referrerId}:${referredUserId}`;

  const completionResult = await prisma.$transaction(async (tx) => {
    const existing = await tx.referralTransaction.findUnique({
      where: {
        referrerId_referredUserId: {
          referrerId,
          referredUserId,
        },
      },
      select: {
        id: true,
        status: true,
        referrerCredited: true,
        referredCredited: true,
      },
    });

    if (existing?.status === 'COMPLETED' && existing.referrerCredited && existing.referredCredited) {
      return {
        alreadyCompleted: true,
        referralTxId: existing.id,
      };
    }

    const [referrer, referred] = await Promise.all([
      tx.user.findUnique({
        where: { id: referrerId },
        select: { id: true },
      }),
      tx.user.findUnique({
        where: { id: referredUserId },
        select: { id: true },
      }),
    ]);

    if (!referrer || !referred) {
      throw new BadRequestError('Referrer or referred user not found');
    }

    const referralTx = await tx.referralTransaction.upsert({
      where: {
        referrerId_referredUserId: {
          referrerId,
          referredUserId,
        },
      },
      update: {
        status: 'COMPLETED',
        completedAt: new Date(),
        referrerCredited: true,
        referredCredited: true,
      },
      create: {
        referrerId,
        referredUserId,
        status: 'COMPLETED',
        referrerAmount: REFERRER_BONUS_RUPEES * 100,
        referredAmount: REFERRED_BONUS_RUPEES * 100,
        completedAt: new Date(),
        referrerCredited: true,
        referredCredited: true,
        idempotencyKey,
      },
      select: {
        id: true,
      },
    });

    const [referrerWalletBalance, referredWalletBalance] = await Promise.all([
      walletService.addToWallet(
        tx,
        referrerId,
        REFERRER_BONUS_RUPEES,
        `Referral bonus for inviting ${referredUserId}`,
        'referral_earned',
        referralTx.id,
        `wallet_referral_credit_referrer:${referralTx.id}:${referrerId}`,
      ),
      walletService.addToWallet(
        tx,
        referredUserId,
        REFERRED_BONUS_RUPEES,
        `Welcome bonus: joined via referral`,
        'referral_earned',
        referralTx.id,
        `wallet_referral_credit_referred:${referralTx.id}:${referredUserId}`,
      ),
    ]);

    await tx.referralLink.updateMany({
      where: {
        userId: referrerId,
        usedByUserId: referredUserId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return {
      alreadyCompleted: false,
      referralTxId: referralTx.id,
      referrerWalletBalance,
      referredWalletBalance,
    };
  });

  if (completionResult.alreadyCompleted) {
    return;
  }

  walletService.emitWalletBalanceUpdated(referrerId, {
    balance: completionResult.referrerWalletBalance!,
    delta: REFERRER_BONUS_RUPEES,
    reason: 'referral_credit',
    relatedReferralId: completionResult.referralTxId,
  });

  walletService.emitWalletBalanceUpdated(referredUserId, {
    balance: completionResult.referredWalletBalance!,
    delta: REFERRED_BONUS_RUPEES,
    reason: 'referral_credit',
    relatedReferralId: completionResult.referralTxId,
  });

  const statusPayload = {
    referralId: completionResult.referralTxId,
    referrerId,
    referredUserId,
    status: 'COMPLETED' as const,
    referrerBonusRupees: REFERRER_BONUS_RUPEES,
    referredBonusRupees: REFERRED_BONUS_RUPEES,
    timestamp: new Date().toISOString(),
  };

  emitUserEvent(referrerId, 'referral:status-changed', statusPayload);
  emitUserEvent(referredUserId, 'referral:status-changed', statusPayload);
}

/**
 * Get referral statistics for a user.
 */
export async function getReferralStats(userId: string) {
  const [sentReferrals, receivedReferrals] = await Promise.all([
    prisma.referralTransaction.findMany({
      where: { referrerId: userId },
      select: {
        id: true,
        status: true,
        referrerAmount: true,
        completedAt: true,
      },
    }),
    prisma.referralTransaction.findMany({
      where: { referredUserId: userId },
      select: {
        id: true,
        status: true,
        referredAmount: true,
        completedAt: true,
      },
    }),
  ]);

  const sentCompleted = sentReferrals.filter((r) => r.status === 'COMPLETED').length;
  const sentPending = sentReferrals.filter((r) => r.status === 'INVITED' || r.status === 'PENDING').length;
  const totalEarned = sentReferrals
    .filter((r) => r.status === 'COMPLETED')
    .reduce((sum, r) => sum + r.referrerAmount / 100, 0); // Convert paise to rupees

  return {
    sentReferrals: sentReferrals.length,
    sentCompleted,
    sentPending,
    totalEarned,
    receivedReferrals: receivedReferrals.length,
  };
}

/**
 * Get paginated list of referrals made by a user.
 */
export async function getMyReferrals(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [referrals, total] = await Promise.all([
    prisma.referralTransaction.findMany({
      where: { referrerId: userId },
      include: {
        referredUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.referralTransaction.count({
      where: { referrerId: userId },
    }),
  ]);

  return {
    referrals: referrals.map((r) => ({
      id: r.id,
      referredUser: r.referredUser,
      status: r.status,
      earnedAmount: r.referrerAmount / 100, // Convert paise to rupees
      completedAt: r.completedAt,
      createdAt: r.createdAt,
    })),
    pagination: {
      page,
      pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get conversion metrics and network stats.
 */
export async function getReferralMetrics(userId: string) {
  const stats = await getReferralStats(userId);

  return {
    ...stats,
    conversionRate:
      stats.sentReferrals > 0 ? ((stats.sentCompleted / stats.sentReferrals) * 100).toFixed(2) + '%' : '0%',
    averageEarningsPerReferral:
      stats.sentCompleted > 0 ? (stats.totalEarned / stats.sentCompleted).toFixed(2) : '0',
  };
}
