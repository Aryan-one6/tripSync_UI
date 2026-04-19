/**
 * Loyalty Points Service — TripSync
 *
 * Formula:
 *  - 1 point = 1 INR
 *  - Points expire 1 year (12 months) after being earned
 *  - Max redemption per booking = 20% of booking amount (in paise)
 *  - Referral bonus: 250 pts to inviter + 250 pts to new user
 *  - Trip completion bonus: 250 pts
 *
 * Model strategy: append-only ledger (LoyaltyPointsLedger).
 * Balance is computed from unexpired, positive rows minus negative rows.
 * Idempotency keys prevent double-crediting the same event.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError } from '../../lib/errors.js';

// Point constants
export const REFERRAL_INVITER_POINTS = 250;
export const REFERRAL_NEW_USER_POINTS = 250;
export const TRIP_COMPLETION_POINTS = 250;
export const POINT_VALUE_PAISE = 100; // 1 point = 1 INR = 100 paise
export const REDEMPTION_CAP_RATIO = 0.20; // max 20% of booking amount
export const POINTS_EXPIRY_MONTHS = 12;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function pointsExpiryDate(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + POINTS_EXPIRY_MONTHS);
  return d;
}

/**
 * Returns unexpired available balance in points for a user.
 * A point row is available if:
 *  - it is positive (earned), not expired, expiresAt > now
 *  OR
 *  - it is negative (redemption / expiry debit) — always counts
 *
 * We sum all rows; positive earns that are past expiresAt do NOT count.
 * NOTE: call this inside a serialisable transaction when used for redemption.
 */
async function _computeBalance(
  userId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  const now = new Date();

  // Sum of earned points that have not yet expired
  const earnedResult = await tx.loyaltyPointsLedger.aggregate({
    where: {
      userId,
      points: { gt: 0 },
      // either no expiry set, or expiry is in the future
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      expired: false,
    },
    _sum: { points: true },
  });

  // Sum of all negative rows (redemptions, expiry debits, adjustments)
  const debitedResult = await tx.loyaltyPointsLedger.aggregate({
    where: {
      userId,
      points: { lte: 0 },
    },
    _sum: { points: true },
  });

  const earned = earnedResult._sum.points ?? 0;
  const debited = debitedResult._sum.points ?? 0;
  return Math.max(0, earned + debited); // debited is already negative
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getLoyaltyBalance(userId: string): Promise<number> {
  return _computeBalance(userId);
}

export async function getLoyaltyLedger(userId: string, limit = 50) {
  return prisma.loyaltyPointsLedger.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Grant referral bonus to BOTH parties when a new user signs up with a referral code.
 * Idempotent: referredUserId is embedded in the idempotency key.
 * Safe to call from the auth service signup flow.
 */
export async function grantReferralBonuses(inviterUserId: string, newUserId: string): Promise<void> {
  const inviterKey = `referral_inviter:${inviterUserId}:${newUserId}`;
  const newUserKey = `referral_new_user:${newUserId}`;
  const expiresAt = pointsExpiryDate();

  await prisma.$transaction(async (tx) => {
    // Check idempotency — guard against double-crediting
    const [existingInviter, existingNew] = await Promise.all([
      tx.loyaltyPointsLedger.findFirst({ where: { idempotencyKey: inviterKey } }),
      tx.loyaltyPointsLedger.findFirst({ where: { idempotencyKey: newUserKey } }),
    ]);

    const ops: Promise<unknown>[] = [];

    if (!existingInviter) {
      ops.push(
        tx.loyaltyPointsLedger.create({
          data: {
            userId: inviterUserId,
            eventType: 'referral_inviter_bonus',
            points: REFERRAL_INVITER_POINTS,
            description: `Referral bonus: invited a new user`,
            idempotencyKey: inviterKey,
            referredUserId: newUserId,
            expiresAt,
          },
        }),
      );
    }

    if (!existingNew) {
      ops.push(
        tx.loyaltyPointsLedger.create({
          data: {
            userId: newUserId,
            eventType: 'referral_new_user_bonus',
            points: REFERRAL_NEW_USER_POINTS,
            description: `Welcome bonus: joined via referral`,
            idempotencyKey: newUserKey,
            referredUserId: inviterUserId,
            expiresAt,
          },
        }),
      );
    }

    await Promise.all(ops);
  });
}

/**
 * Grant 250 points to a user upon successful trip completion.
 * Idempotent on (userId, groupId) — safe to retry.
 */
export async function grantTripCompletionBonus(userId: string, groupId: string, paymentId: string): Promise<void> {
  const key = `trip_bonus:${userId}:${groupId}`;
  const expiresAt = pointsExpiryDate();

  await prisma.$transaction(async (tx) => {
    // Check payment's tripBonusIssued flag for extra guard
    const payment = await tx.payment.findFirst({
      where: { id: paymentId, userId },
      select: { id: true, tripBonusIssued: true },
    });

    if (payment?.tripBonusIssued) {
      return; // already issued
    }

    const existing = await tx.loyaltyPointsLedger.findFirst({
      where: { idempotencyKey: key },
    });

    if (!existing) {
      await tx.loyaltyPointsLedger.create({
        data: {
          userId,
          eventType: 'successful_trip_bonus',
          points: TRIP_COMPLETION_POINTS,
          description: `Trip completion bonus for group ${groupId}`,
          idempotencyKey: key,
          groupId,
          paymentId,
          expiresAt,
        },
      });
    }

    if (payment) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { tripBonusIssued: true },
      });
    }
  });
}

/**
 * Compute the maximum points redeemable for a given booking amount.
 * bookingAmountPaise — total amount the user is paying (in paise)
 * Returns the max points that can be redeemed (1 pt = 1 INR = 100 paise).
 */
export function computeMaxRedeemablePoints(bookingAmountPaise: number): number {
  const capPaise = Math.floor(bookingAmountPaise * REDEMPTION_CAP_RATIO);
  // Convert paise to points (1 point = 100 paise)
  return Math.floor(capPaise / POINT_VALUE_PAISE);
}

/**
 * Redeem points against a payment. Validates:
 *  - user has enough unexpired points
 *  - redemption does not exceed 20% of booking amount
 *  - idempotent: one redemption per payment
 *
 * Returns the paise discount applied.
 */
export async function redeemPoints(
  userId: string,
  paymentId: string,
  groupId: string,
  pointsRequested: number,
  bookingAmountPaise: number,
): Promise<{ pointsRedeemed: number; paiseDiscount: number }> {
  const maxPoints = computeMaxRedeemablePoints(bookingAmountPaise);

  if (pointsRequested <= 0) {
    throw new BadRequestError('Must redeem at least 1 point');
  }

  if (pointsRequested > maxPoints) {
    throw new BadRequestError(
      `Maximum redeemable points for this booking is ${maxPoints} (20% of booking value)`,
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // Idempotency check
      const existing = await tx.loyaltyPointsLedger.findFirst({
        where: { paymentId, eventType: 'redemption', userId },
      });

      if (existing) {
        // Return the already-processed redemption without re-applying
        return {
          pointsRedeemed: Math.abs(existing.points),
          paiseDiscount: Math.abs(existing.points) * POINT_VALUE_PAISE,
        };
      }

      const balance = await _computeBalance(userId, tx);

      if (balance < pointsRequested) {
        throw new BadRequestError(
          `Insufficient points. Available: ${balance}, requested: ${pointsRequested}`,
        );
      }

      await tx.loyaltyPointsLedger.create({
        data: {
          userId,
          eventType: 'redemption',
          points: -pointsRequested,
          description: `Points redeemed for payment ${paymentId}`,
          idempotencyKey: `redemption:${paymentId}`,
          groupId,
          paymentId,
          expiresAt: null,
        },
      });

      // Write pointsRedeemed to the payment record
      await tx.payment.update({
        where: { id: paymentId },
        data: { pointsRedeemed: pointsRequested },
      });

      return {
        pointsRedeemed: pointsRequested,
        paiseDiscount: pointsRequested * POINT_VALUE_PAISE,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  return result;
}

/**
 * Expire points that have passed their expiresAt date.
 * Should be run as a scheduled job (nightly or weekly).
 * Creates negative debit rows to cancel expired earns.
 */
export async function expireStalePoints(): Promise<{ usersProcessed: number; rowsExpired: number }> {
  const now = new Date();

  // Find unexpired positive rows that have passed expiresAt
  const staleRows = await prisma.loyaltyPointsLedger.findMany({
    where: {
      points: { gt: 0 },
      expiresAt: { lt: now },
      expired: false,
    },
    select: { id: true, userId: true, points: true, groupId: true },
  });

  if (staleRows.length === 0) {
    return { usersProcessed: 0, rowsExpired: 0 };
  }

  // Group by userId so we create one expiry debit per user batch
  const byUser = new Map<string, typeof staleRows>();
  for (const row of staleRows) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }

  let rowsExpired = 0;

  for (const [userId, rows] of byUser) {
    const totalPoints = rows.reduce((sum, r) => sum + r.points, 0);
    const ids = rows.map((r) => r.id);

    await prisma.$transaction([
      // Mark original rows as expired
      prisma.loyaltyPointsLedger.updateMany({
        where: { id: { in: ids } },
        data: { expired: true, expiredAt: now },
      }),
      // Create debit row for audit trail
      prisma.loyaltyPointsLedger.create({
        data: {
          userId,
          eventType: 'expiry',
          points: -totalPoints,
          description: `${totalPoints} points expired (${ids.length} earn events)`,
          expiresAt: null,
        },
      }),
    ]);

    rowsExpired += rows.length;
  }

  return { usersProcessed: byUser.size, rowsExpired };
}

/**
 * Admin: grant or deduct points manually.
 */
export async function adminAdjustPoints(
  userId: string,
  points: number,
  description: string,
  adminUserId: string,
): Promise<void> {
  const expiresAt = points > 0 ? pointsExpiryDate() : null;

  await prisma.loyaltyPointsLedger.create({
    data: {
      userId,
      eventType: 'manual_adjustment',
      points,
      description: `[Admin ${adminUserId}] ${description}`,
      idempotencyKey: undefined,
      expiresAt,
    },
  });
}
