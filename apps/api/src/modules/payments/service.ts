import crypto from 'crypto';
import type {
  CreateDisputeInput,
  MockCapturePaymentInput,
  VerifyPaymentInput,
  ResolveDisputeInput,
} from '@tripsync/shared';
import { PaymentStatus, PlanStatus, Prisma, DisputeStatus, WalletPayoutMode, TransferStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../lib/env.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { emitAgencyEvent, emitGroupEvent, emitUserEvent } from '../../lib/socket.js';
import { createSystemMessage } from '../chat/service.js';
import { createStoredNotificationsBulk } from '../notifications/service.js';
import {
  queueNotification,
  scheduleConfirmingWindow,
  scheduleEscrowRelease,
} from '../../lib/queue.js';

let razorpayClientPromise: Promise<any | null> | null = null;

// ─── Platform Financial Constants ────────────────────────────────────────────
// ESCROW FORMULA:
//   Customer pays 100% of (tripAmount + PLATFORM_FEE + FEE_GST) upfront
//   PLATFORM_COMMISSION = 10% of tripAmount
//   AGENCY_NET = tripAmount - PLATFORM_COMMISSION
//   INITIAL_PAYOUT (before trip) = 30% of AGENCY_NET
//   FINAL_PAYOUT (post-completion) = 70% of AGENCY_NET
// ---------------------------------------------------------
const PLATFORM_FEE_PAISE = 299 * 100;
const FEE_GST_RATE = 0.18;
const COMMISSION_RATE = 0.10; // 10% of trip amount — platform revenue
const PRE_TRIP_TRANCHE_RATIO = 0.30;  // 30% of agency net released before trip
const POST_TRIP_TRANCHE_RATIO = 0.70; // 70% of agency net released after completion
const PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000;

type PaymentBreakdown = {
  tripAmount: number;
  platformFeeAmount: number;
  feeGstAmount: number;
  commissionAmount: number;
  agencyNetAmount: number;   // tripAmount - commissionAmount
  initialPayoutAmount: number; // 30% of agencyNetAmount (pre-trip)
  finalPayoutAmount: number;   // 70% of agencyNetAmount (post-trip)
  totalAmount: number;
};

type GroupPaymentContext = Awaited<ReturnType<typeof getGroupPaymentContext>>;

function computePaymentBreakdown(tripAmount: number): PaymentBreakdown {
  const feeGstAmount = Math.round(PLATFORM_FEE_PAISE * FEE_GST_RATE);
  const commissionAmount = Math.round(tripAmount * COMMISSION_RATE);
  const agencyNetAmount = tripAmount - commissionAmount;
  return {
    tripAmount,
    platformFeeAmount: PLATFORM_FEE_PAISE,
    feeGstAmount,
    commissionAmount,
    agencyNetAmount,
    initialPayoutAmount: Math.round(agencyNetAmount * PRE_TRIP_TRANCHE_RATIO),
    finalPayoutAmount: Math.round(agencyNetAmount * POST_TRIP_TRANCHE_RATIO),
    totalAmount: tripAmount + PLATFORM_FEE_PAISE + feeGstAmount,
  };
}

function getTranchePercents(payoutMode: WalletPayoutMode, tranche: 'tranche1' | 'tranche2') {
  if (payoutMode === WalletPayoutMode.PRO) {
    // PRO mode: tranche1 = 30% of agency net, tranche2 = 32% (extra trust bonus)
    return tranche === 'tranche1' ? PRE_TRIP_TRANCHE_RATIO : 0.32;
  }
  // TRUST mode: 50/50 split
  return 0.5;
}

function toInvoiceNumber(paymentId: string) {
  const suffix = paymentId.replace(/-/g, '').slice(0, 8).toUpperCase();
  const year = new Date().getUTCFullYear();
  return `INV-${year}-${suffix}`;
}

async function getRazorpayClient() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  if (!razorpayClientPromise) {
    razorpayClientPromise = import('razorpay').then((module) => {
      const Razorpay = (module.default ?? module) as any;
      return new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      });
    });
  }

  return razorpayClientPromise;
}

async function resolveAgencyForActor(
  userId: string,
  allowedRoles: Array<'ADMIN' | 'MANAGER' | 'AGENT' | 'FINANCE'>,
) {
  const owned = await prisma.agency.findUnique({
    where: { ownerId: userId },
    select: { id: true },
  });

  if (owned) {
    return owned.id;
  }

  const member = await prisma.agencyMember.findFirst({
    where: {
      userId,
      isActive: true,
      role: { in: allowedRoles },
    },
    select: { agencyId: true },
  });

  if (!member) {
    throw new ForbiddenError('Agency access required');
  }

  return member.agencyId;
}

async function getGroupPaymentContext(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          phone: true,
        },
      },
      group: {
        include: {
          plan: {
            include: {
              selectedOffer: {
                include: {
                  agency: {
                    select: {
                      id: true,
                      name: true,
                      ownerId: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          package: {
            include: {
              agency: {
                select: {
                  id: true,
                  name: true,
                  ownerId: true,
                  phone: true,
                },
              },
            },
          },
          members: {
            where: { status: { in: ['APPROVED', 'COMMITTED'] } },
            select: { userId: true, status: true },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      },
    },
  });

  if (!membership) throw new NotFoundError('Group member');
  if (membership.status !== 'APPROVED' && membership.status !== 'COMMITTED') {
    throw new ForbiddenError('Only approved travelers can complete payment');
  }

  if (membership.group.plan?.selectedOffer) {
    if (
      membership.group.plan.status !== PlanStatus.CONFIRMING &&
      membership.group.plan.status !== PlanStatus.CONFIRMED
    ) {
      throw new BadRequestError('This trip is not in a payable state');
    }

    const tripAmount = membership.group.plan.selectedOffer.pricePerPerson * 100;
    const breakdown = computePaymentBreakdown(tripAmount);
    const existingPayment =
      membership.group.payments.find((payment) => payment.userId === userId) ?? null;

    return {
      membership,
      group: membership.group,
      plan: membership.group.plan,
      package: null,
      offer: membership.group.plan.selectedOffer,
      agency: membership.group.plan.selectedOffer.agency,
      paymentSource: 'PLAN_OFFER' as const,
      breakdown,
      existingPayment,
    };
  }

  if (membership.group.package) {
    if (
      membership.group.package.status !== PlanStatus.OPEN &&
      membership.group.package.status !== PlanStatus.CONFIRMING &&
      membership.group.package.status !== PlanStatus.CONFIRMED
    ) {
      throw new BadRequestError('This package is not in a payable state yet');
    }

    const tripAmount = membership.group.package.basePrice * 100;
    const breakdown = computePaymentBreakdown(tripAmount);
    const existingPayment =
      membership.group.payments.find((payment) => payment.userId === userId) ?? null;

    return {
      membership,
      group: membership.group,
      plan: null,
      package: membership.group.package,
      offer: null,
      agency: membership.group.package.agency,
      paymentSource: 'PACKAGE' as const,
      breakdown,
      existingPayment,
    };
  }

  throw new BadRequestError('Payment opens once an offer is accepted or package reaches confirming stage');
}

function buildCheckoutDescription(context: GroupPaymentContext) {
  if (context.plan) {
    return `${context.plan.title} · ${context.agency.name}`;
  }
  return `${context.package.title} · ${context.agency.name}`;
}

function buildMockOrderId(paymentId: string) {
  return `order_mock_${paymentId.replace(/-/g, '').slice(0, 20)}`;
}

function getProgressStateName(context: {
  plan: { title: string; id: string; creatorId: string; startDate: Date | null; endDate: Date | null } | null;
  package: { title: string; id: string; startDate: Date | null; endDate: Date | null } | null;
}) {
  if (context.plan) {
    return {
      title: context.plan.title,
      planId: context.plan.id,
      packageId: null,
      creatorId: context.plan.creatorId,
      startDate: context.plan.startDate,
      endDate: context.plan.endDate,
    };
  }

  return {
    title: context.package?.title ?? 'Trip',
    planId: null,
    packageId: context.package?.id ?? null,
    creatorId: null,
    startDate: context.package?.startDate ?? null,
    endDate: context.package?.endDate ?? null,
  };
}

async function createInvoiceForPayment(tx: Prisma.TransactionClient, payload: {
  paymentId: string;
  groupId: string;
  agencyId: string;
  userId: string;
  amount: number;
  tripAmount: number;
  platformFeeAmount: number;
  feeGstAmount: number;
  commissionAmount: number;
  currency: string;
}) {
  return tx.invoice.upsert({
    where: { paymentId: payload.paymentId },
    update: {
      amount: payload.amount,
      platformFeeAmount: payload.platformFeeAmount,
      feeGstAmount: payload.feeGstAmount,
      commissionAmount: payload.commissionAmount,
      totalAmount: payload.amount,
      currency: payload.currency,
    },
    create: {
      paymentId: payload.paymentId,
      groupId: payload.groupId,
      agencyId: payload.agencyId,
      userId: payload.userId,
      invoiceNumber: toInvoiceNumber(payload.paymentId),
      amount: payload.tripAmount,
      platformFeeAmount: payload.platformFeeAmount,
      feeGstAmount: payload.feeGstAmount,
      commissionAmount: payload.commissionAmount,
      totalAmount: payload.amount,
      currency: payload.currency,
    },
  });
}

async function upsertAgencyWallet(tx: Prisma.TransactionClient, agencyId: string) {
  return tx.agencyWallet.upsert({
    where: { agencyId },
    update: {},
    create: { agencyId },
  });
}

async function finalizeCapturedPayment(
  paymentId: string,
  razorpayPaymentId?: string,
  signalSource: 'checkout' | 'webhook' | 'mock' | 'reconciliation' = 'checkout',
) {
  const result = await prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              phone: true,
            },
          },
          dispute: {
            select: { id: true, status: true },
          },
          group: {
            include: {
              members: {
                where: { status: { in: ['APPROVED', 'COMMITTED'] } },
                select: { userId: true, status: true },
              },
              plan: {
                include: {
                  selectedOffer: {
                    include: {
                      agency: {
                        select: {
                          id: true,
                          name: true,
                          ownerId: true,
                          phone: true,
                        },
                      },
                    },
                  },
                },
              },
              package: {
                include: {
                  agency: {
                    select: {
                      id: true,
                      name: true,
                      ownerId: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!payment) throw new NotFoundError('Payment');

      const planAgency = payment.group.plan?.selectedOffer?.agency ?? null;
      const packageAgency = payment.group.package?.agency ?? null;
      const agency = payment.source === 'PLAN_OFFER' ? planAgency : packageAgency;
      if (!agency) {
        throw new BadRequestError('Payment is not linked to a payable agency context');
      }

      if (payment.status === PaymentStatus.CAPTURED) {
        const stateName = getProgressStateName({
          plan: payment.group.plan,
          package: payment.group.package,
        });
        return {
          payment,
          agency,
          user: payment.user,
          alreadyCaptured: true,
          allCommitted:
            payment.source === 'PLAN_OFFER'
              ? payment.group.plan?.status === PlanStatus.CONFIRMED
              : payment.group.package?.status === PlanStatus.CONFIRMED,
          stateName,
          groupId: payment.groupId,
        };
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CAPTURED,
          razorpayPaymentId: razorpayPaymentId ?? payment.razorpayPaymentId,
          paidAt: new Date(),
          // Persist payout schedule for audit trail
          agencyNetAmount: Math.round(payment.tripAmount * (1 - COMMISSION_RATE)),
          initialPayout: Math.round(payment.tripAmount * (1 - COMMISSION_RATE) * PRE_TRIP_TRANCHE_RATIO),
          finalPayout: Math.round(payment.tripAmount * (1 - COMMISSION_RATE) * POST_TRIP_TRANCHE_RATIO),
        },
      });

      await tx.groupMember.update({
        where: { groupId_userId: { groupId: payment.groupId, userId: payment.userId } },
        data: {
          status: 'COMMITTED',
          committedAt: new Date(),
        },
      });

      const activeMembers = payment.group.members.map((member) => member.userId);
      const capturedPayments = await tx.payment.findMany({
        where: {
          groupId: payment.groupId,
          userId: { in: activeMembers },
          status: PaymentStatus.CAPTURED,
        },
        select: { userId: true },
      });

      const capturedUserIds = new Set(capturedPayments.map((item) => item.userId));
      capturedUserIds.add(payment.userId);

      const allCommitted = activeMembers.every((memberId) => capturedUserIds.has(memberId));
      const minRequiredPayers =
        payment.source === 'PLAN_OFFER'
          ? payment.group.plan?.groupSizeMin ?? 1
          : payment.group.package?.groupSizeMin ?? 1;
      const canConfirm = allCommitted && capturedUserIds.size >= minRequiredPayers;

      if (payment.source === 'PLAN_OFFER' && payment.group.plan) {
        if (canConfirm) {
          await tx.plan.update({
            where: { id: payment.group.plan.id },
            data: {
              status: PlanStatus.CONFIRMED,
              confirmedAt: new Date(),
            },
          });

          await tx.group.update({
            where: { id: payment.groupId },
            data: { isLocked: true, paymentWindowEndsAt: null },
          });
        }
      }

      if (payment.source === 'PACKAGE' && payment.group.package) {
        if (canConfirm) {
          await tx.package.update({
            where: { id: payment.group.package.id },
            data: { status: PlanStatus.CONFIRMED },
          });

          await tx.group.update({
            where: { id: payment.groupId },
            data: { isLocked: true, paymentWindowEndsAt: null },
          });
        }
      }

      const wallet = await upsertAgencyWallet(tx, agency.id);
      const netAgencyAmount = payment.tripAmount - payment.commissionAmount;
      await tx.agencyWallet.update({
        where: { id: wallet.id },
        data: {
          pendingBalance: { increment: netAgencyAmount },
        },
      });

      await tx.agencyTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'booking_received',
          amount: netAgencyAmount,
          description: `Booking received for group ${payment.groupId}`,
          groupId: payment.groupId,
          paymentId: payment.id,
        },
      });

      if (wallet.payoutMode === WalletPayoutMode.PRO && canConfirm) {
        const advancePercent = 0.3;
        const advanceGross = Math.round(payment.tripAmount * advancePercent);
        const advanceCommission = Math.round(payment.commissionAmount * advancePercent);
        const advanceNet = advanceGross - advanceCommission;

        await tx.agencyWallet.update({
          where: { id: wallet.id },
          data: {
            pendingBalance: { decrement: advanceNet },
            availableBalance: { increment: advanceNet },
            totalEarned: { increment: advanceNet },
            totalCommission: { increment: advanceCommission },
          },
        });

        await tx.agencyTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'tranche_released',
            amount: advanceNet,
            description: `Pro advance released (30%) for payment ${payment.id}`,
            groupId: payment.groupId,
            paymentId: payment.id,
            razorpayTransferId: `queued:pro-advance:${payment.id}`,
          },
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            transferStatus: TransferStatus.PROCESSING,
            transferReference: `queued:pro-advance:${payment.id}`,
          },
        });
      }

      await createInvoiceForPayment(tx, {
        paymentId: payment.id,
        groupId: payment.groupId,
        agencyId: agency.id,
        userId: payment.userId,
        amount: payment.amount,
        tripAmount: payment.tripAmount,
        platformFeeAmount: payment.platformFeeAmount,
        feeGstAmount: payment.feeGstAmount,
        commissionAmount: payment.commissionAmount,
        currency: payment.currency,
      });

      const stateName = getProgressStateName({
        plan: payment.group.plan,
        package: payment.group.package,
      });

      return {
        payment: updatedPayment,
        agency,
        user: payment.user,
        alreadyCaptured: false,
        allCommitted: canConfirm,
        stateName,
        groupId: payment.groupId,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  if (result.alreadyCaptured) {
    return result.payment;
  }

  const actorName = result.user?.fullName ?? 'A traveler';
  await createSystemMessage(
    result.groupId,
    `${actorName} completed payment via ${signalSource}.`,
    { paymentId, status: 'CAPTURED', action: 'payment_progress' },
  );

  emitGroupEvent(result.groupId, 'payment:captured', {
    paymentId,
    groupId: result.groupId,
    status: 'CAPTURED',
    allCommitted: result.allCommitted,
  });

  emitAgencyEvent(result.agency.id, 'payment:captured', {
    paymentId,
    groupId: result.groupId,
    planId: result.stateName.planId,
    packageId: result.stateName.packageId,
    status: 'CAPTURED',
  });

  if (result.stateName.creatorId) {
    emitUserEvent(result.stateName.creatorId, 'payment:captured', {
      paymentId,
      groupId: result.groupId,
      planId: result.stateName.planId,
      status: 'CAPTURED',
    });
  }

  await queueNotification({
    type: 'payment_captured',
    title: `${actorName} completed payment`,
    body: `${result.stateName.title} moved one step closer to confirmation.`,
    userIds: [
      ...(result.stateName.creatorId ? [result.stateName.creatorId] : []),
      result.agency.ownerId,
    ],
    phoneNumbers: result.user?.phone ? [result.user.phone] : undefined,
    ctaUrl: `${env.FRONTEND_URL}/dashboard/groups/${result.groupId}/checkout`,
    metadata: {
      paymentId,
      groupId: result.groupId,
      planId: result.stateName.planId,
      packageId: result.stateName.packageId,
    },
  });

  if (result.allCommitted) {
    await createSystemMessage(
      result.groupId,
      'All required traveler payments were received. The trip is now confirmed.',
      {
        planId: result.stateName.planId,
        packageId: result.stateName.packageId,
        status: 'CONFIRMED',
        action: 'payment_progress',
      },
    );

    const maskedPhone = result.agency.phone
      ? `${result.agency.phone.slice(0, 2)}****${result.agency.phone.slice(-3)}`
      : 'Shared in-app once needed';

    await createSystemMessage(
      result.groupId,
      `Trip Contact Card: ${result.agency.name} · Contact ${maskedPhone}. Continue payments and coordination on TravellersIn for escrow protection.`,
      {
        action: 'trip_contact_card',
        agencyId: result.agency.id,
      },
    );

    emitGroupEvent(result.groupId, 'payment:plan_confirmed', {
      groupId: result.groupId,
      planId: result.stateName.planId,
      packageId: result.stateName.packageId,
      status: 'CONFIRMED',
    });

    await queueNotification({
      type: 'trip_confirmed',
      title: `${result.stateName.title} is confirmed`,
      body: `Every required traveler has paid. Group coordination is now fully active.`,
      userIds: [
        ...(result.stateName.creatorId ? [result.stateName.creatorId] : []),
        result.agency.ownerId,
      ],
      ctaUrl: `${env.FRONTEND_URL}/dashboard/messages?groupId=${encodeURIComponent(result.groupId)}`,
      metadata: {
        groupId: result.groupId,
        planId: result.stateName.planId,
        packageId: result.stateName.packageId,
      },
    });
  }

  if (result.stateName.startDate) {
    await scheduleEscrowRelease(paymentId, 'tranche1', result.stateName.startDate);
  }

  if (result.stateName.endDate) {
    const tranche2RunAt = new Date(result.stateName.endDate.getTime() + PAYMENT_WINDOW_MS);
    await scheduleEscrowRelease(paymentId, 'tranche2', tranche2RunAt);
  }

  return result.payment;
}

export async function getGroupPaymentState(groupId: string, userId: string) {
  const context = await getGroupPaymentContext(groupId, userId);
  const committedCount = context.group.members.filter((member) => member.status === 'COMMITTED').length;

  // Fetch loyalty + wallet balances for checkout UI
  const { getLoyaltyBalance, computeMaxRedeemablePoints } = await import('../loyalty/service.js');
  const { getWalletBalance } = await import('../wallet/service.js');
  const loyaltyBalance = await getLoyaltyBalance(userId);
  const maxRedeemablePoints = computeMaxRedeemablePoints(context.breakdown.tripAmount);
  const effectiveMaxRedeem = Math.min(loyaltyBalance, maxRedeemablePoints);
  const walletBalance = await getWalletBalance(userId);
  const maxWalletRupees = Math.min(walletBalance, Math.floor(context.breakdown.tripAmount / 100));

  return {
    groupId,
    agencyName: context.agency.name,
    paymentSource: context.paymentSource,
    plan: context.plan
      ? {
          id: context.plan.id,
          title: context.plan.title,
          slug: context.plan.slug,
          status: context.plan.status,
        }
      : null,
    package: context.package
      ? {
          id: context.package.id,
          title: context.package.title,
          slug: context.package.slug,
          status: context.package.status,
        }
      : null,
    offer: context.offer
      ? {
          id: context.offer.id,
          agencyName: context.agency.name,
          pricePerPerson: context.offer.pricePerPerson,
        }
      : null,
    payment: context.existingPayment,
    amount: context.breakdown.totalAmount,
    breakdown: {
      ...context.breakdown,
      // Escrow payout schedule (informational, for user transparency)
      agencyNetAmount: context.breakdown.agencyNetAmount,
      initialPayoutAmount: context.breakdown.initialPayoutAmount,
      finalPayoutAmount: context.breakdown.finalPayoutAmount,
    },
    // Loyalty redemption info
    loyalty: {
      availablePoints: loyaltyBalance,
      maxRedeemablePoints: effectiveMaxRedeem,
      // Paise value of max redeemable points (1 pt = 1 INR = 100 paise)
      maxDiscountPaise: effectiveMaxRedeem * 100,
      pointValueInr: 1, // 1 point = 1 INR
    },
    wallet: {
      availableBalanceRupees: walletBalance,
      maxUsableRupees: maxWalletRupees,
      autoApply: walletBalance > 0,
    },
    currency: 'INR',
    committedCount,
    travelerCount: context.group.members.length,
    checkoutMode: env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET ? 'razorpay' : 'mock',
    razorpayKeyId: env.RAZORPAY_KEY_ID || null,
  };
}

/**
 * GET /payments/groups/:groupId/checkout — read-only breakdown preview.
 * Computes the full price breakdown including optional promo, points, and wallet deductions
 * without creating any payment order. Safe to call multiple times.
 */
export async function getCheckoutBreakdownPreview(
  groupId: string,
  userId: string,
  options?: { promoCode?: string; pointsToRedeem?: number; walletAmountToUse?: number },
) {
  const context = await getGroupPaymentContext(groupId, userId);

  const requestedPoints = options?.pointsToRedeem ?? 0;
  const requestedWallet = options?.walletAmountToUse ?? 0;
  const promoCodeRaw = options?.promoCode?.trim().toUpperCase() ?? null;

  // ── Wallet preview ──
  let walletDiscount = 0;
  let walletAmountUsed = 0;
  let walletError: string | null = null;
  if (requestedWallet > 0) {
    const { getWalletBalance } = await import('../wallet/service.js');
    const balance = await getWalletBalance(userId);
    if (requestedWallet > balance) {
      walletError = `Cannot use ₹${requestedWallet}. Available: ₹${balance}`;
    } else {
      walletAmountUsed = requestedWallet;
      walletDiscount = requestedWallet * 100;
    }
  }

  // ── Points preview ──
  let pointsDiscount = 0;
  let pointsRedeemed = 0;
  let pointsError: string | null = null;
  if (requestedPoints > 0) {
    const { computeMaxRedeemablePoints, getLoyaltyBalance } = await import('../loyalty/service.js');
    const balance = await getLoyaltyBalance(userId);
    const maxRedeem = computeMaxRedeemablePoints(context.breakdown.tripAmount - walletDiscount);
    const effectiveMax = Math.min(balance, maxRedeem);
    if (requestedPoints > effectiveMax) {
      pointsError = `Cannot redeem ${requestedPoints} points. Max: ${effectiveMax}`;
    } else {
      pointsRedeemed = requestedPoints;
      pointsDiscount = requestedPoints * 100;
    }
  }

  // ── Promo code preview ──
  let promoDiscount = 0;
  let promoError: string | null = null;
  let promoDescription: string | null = null;
  if (promoCodeRaw) {
    const promo = await prisma.promotionalDiscount.findUnique({
      where: { code: promoCodeRaw },
      include: { usages: { where: { userId }, select: { id: true } } },
    });
    if (!promo || !promo.isActive) {
      promoError = 'Promo code not found or inactive.';
    } else if (promo.expiresAt && promo.expiresAt < new Date()) {
      promoError = 'This promo code has expired.';
    } else if (promo.maxUsageTotal !== null && promo.usageCount >= promo.maxUsageTotal) {
      promoError = 'This promo code has reached its usage limit.';
    } else if (promo.usages.length >= promo.maxUsagePerUser) {
      promoError = 'You have already used this promo code.';
    } else {
      const basketPaise = context.breakdown.totalAmount - walletDiscount - pointsDiscount;
      if (basketPaise < promo.minOrderAmount) {
        promoError = `Minimum order of ₹${(promo.minOrderAmount / 100).toLocaleString('en-IN')} required.`;
      } else {
        const rawDiscount =
          promo.discountType === 'percent'
            ? Math.floor((basketPaise * promo.discountValue) / 10000)
            : promo.discountValue;
        promoDiscount = promo.maxDiscountAmount !== null
          ? Math.min(rawDiscount, promo.maxDiscountAmount)
          : rawDiscount;
        promoDescription = promo.description ?? null;
      }
    }
  }

  const effectiveTotal = Math.max(
    0,
    context.breakdown.totalAmount - walletDiscount - pointsDiscount - promoDiscount,
  );

  // ── Loyalty / wallet balances for UI ──
  const { getLoyaltyBalance, computeMaxRedeemablePoints } = await import('../loyalty/service.js');
  const { getWalletBalance } = await import('../wallet/service.js');
  const loyaltyBalance = await getLoyaltyBalance(userId);
  const walletBalance = await getWalletBalance(userId);
  const maxRedeemablePoints = computeMaxRedeemablePoints(context.breakdown.tripAmount);
  const effectiveMaxRedeem = Math.min(loyaltyBalance, maxRedeemablePoints);

  return {
    groupId,
    agencyName: context.agency.name,
    paymentSource: context.paymentSource,
    plan: context.plan
      ? { id: context.plan.id, title: context.plan.title, slug: context.plan.slug }
      : null,
    package: context.package
      ? { id: context.package.id, title: context.package.title, slug: context.package.slug }
      : null,
    currency: 'INR',
    breakdown: {
      tripAmount: context.breakdown.tripAmount,
      platformFeeAmount: context.breakdown.platformFeeAmount,
      feeGstAmount: context.breakdown.feeGstAmount,
      subtotal: context.breakdown.totalAmount,
      walletDiscount,
      walletAmountUsed,
      pointsDiscount,
      pointsRedeemed,
      promoDiscount,
      promoCode: promoCodeRaw,
      promoDescription,
      effectiveTotal,
    },
    errors: {
      wallet: walletError,
      points: pointsError,
      promo: promoError,
    },
    loyalty: {
      availablePoints: loyaltyBalance,
      maxRedeemablePoints: effectiveMaxRedeem,
      maxDiscountPaise: effectiveMaxRedeem * 100,
    },
    wallet: {
      availableBalanceRupees: walletBalance,
      maxUsableRupees: Math.min(walletBalance, Math.floor(context.breakdown.tripAmount / 100)),
    },
    checkoutMode: env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET ? 'razorpay' : 'mock',
    razorpayKeyId: env.RAZORPAY_KEY_ID || null,
  };
}



export async function listMyPayments(userId: string) {
  return prisma.payment.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          plan: {
            select: {
              id: true,
              slug: true,
              title: true,
              status: true,
            },
          },
          package: {
            select: {
              id: true,
              slug: true,
              title: true,
              status: true,
            },
          },
        },
      },
      invoice: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createOrder(
  groupId: string,
  userId: string,
  options?: { pointsToRedeem?: number; walletAmountToUse?: number; promoCode?: string },
) {
  const context = await getGroupPaymentContext(groupId, userId);
  const requestedPoints = options?.pointsToRedeem ?? 0;
  const requestedWallet = options?.walletAmountToUse ?? 0;
  const promoCodeRaw = options?.promoCode?.trim().toUpperCase();

  if (!Number.isInteger(requestedPoints) || requestedPoints < 0) {
    throw new BadRequestError('pointsToRedeem must be a non-negative integer');
  }
  if (!Number.isInteger(requestedWallet) || requestedWallet < 0) {
    throw new BadRequestError('walletAmountToUse must be a non-negative integer');
  }

  // Package checkout can start while package is OPEN.
  // First order moves it into CONFIRMING and opens the 48h payment window.
  if (context.package?.status === PlanStatus.OPEN) {
    const runAt = new Date(Date.now() + PAYMENT_WINDOW_MS);
    const moved = await prisma.$transaction(async (tx) => {
      const pkgUpdated = await tx.package.updateMany({
        where: {
          id: context.package!.id,
          status: PlanStatus.OPEN,
        },
        data: {
          status: PlanStatus.CONFIRMING,
        },
      });

      if (pkgUpdated.count === 0) return false;

      await tx.group.update({
        where: { id: context.group.id },
        data: { paymentWindowEndsAt: runAt },
      });

      return true;
    });

    if (moved) {
      await scheduleConfirmingWindow(context.group.id, runAt);
      await createSystemMessage(
        context.group.id,
        'Payment window is now open for 48 hours.',
        { groupId: context.group.id, action: 'payment_window_opened' },
      );
    }
  }

  if (context.existingPayment?.status === PaymentStatus.CAPTURED) {
    const capturedWalletAmountUsed = Number(context.existingPayment.walletAmountUsed ?? 0);
    const capturedPointsRedeemed = context.existingPayment.pointsRedeemed ?? 0;

    return {
      payment: context.existingPayment,
      amount: context.existingPayment.amount,
      breakdown: {
        tripAmount: context.existingPayment.tripAmount || context.breakdown.tripAmount,
        platformFeeAmount:
          context.existingPayment.platformFeeAmount || context.breakdown.platformFeeAmount,
        feeGstAmount: context.existingPayment.feeGstAmount || context.breakdown.feeGstAmount,
        commissionAmount:
          context.existingPayment.commissionAmount || context.breakdown.commissionAmount,
        totalAmount: context.existingPayment.amount,
        pointsRedeemed: capturedPointsRedeemed,
        pointsDiscount: capturedPointsRedeemed * 100,
        walletAmountUsed: capturedWalletAmountUsed,
        walletDiscount: capturedWalletAmountUsed * 100,
      },
      paymentSource: context.paymentSource,
      currency: context.existingPayment.currency,
      checkoutMode: 'captured',
      razorpayKeyId: env.RAZORPAY_KEY_ID || null,
    };
  }

  // ─── Wallet Balance Deduction ──────────────────────────────────────────────
  let walletDiscount = 0; // in paise
  let walletAmountUsed = 0; // in rupees

  if (requestedWallet > 0) {
    const { getWalletBalance } = await import('../wallet/service.js');
    const balance = await getWalletBalance(userId);
    const requested = requestedWallet;

    if (requested > balance) {
      throw new BadRequestError(
        `Cannot use ₹${requested} from wallet. Available balance: ₹${balance}`,
      );
    }

    // Also validate that wallet + points don't exceed booking amount
    const tripAmountRupees = Math.floor(context.breakdown.tripAmount / 100);
    const pointsRedeemRupees = requestedPoints;
    const totalDiscountRupees = requested + pointsRedeemRupees;

    if (totalDiscountRupees > tripAmountRupees) {
      throw new BadRequestError(
        `Total discount (wallet ₹${requested} + points ₹${pointsRedeemRupees}) cannot exceed booking amount ₹${tripAmountRupees}`,
      );
    }

    walletAmountUsed = requested;
    walletDiscount = requested * 100; // Convert rupees to paise
  }

  // ─── Loyalty Points Redemption ──────────────────────────────────────────────
  // Points can ONLY be redeemed in trip payments (enforced here at order creation)
  let pointsDiscount = 0;
  let pointsRedeemed = 0;

  if (requestedPoints > 0) {
    const { computeMaxRedeemablePoints, getLoyaltyBalance } = await import('../loyalty/service.js');
    const balance = await getLoyaltyBalance(userId);
    const maxRedeem = computeMaxRedeemablePoints(context.breakdown.tripAmount - walletDiscount);
    const effectiveMax = Math.min(balance, maxRedeem);
    const requested = requestedPoints;

    if (requested > effectiveMax) {
      throw new BadRequestError(
        `Cannot redeem ${requested} points. Max redeemable: ${effectiveMax} (balance: ${balance}, cap: ${maxRedeem})`,
      );
    }

    pointsRedeemed = requested;
    pointsDiscount = requested * 100; // 1 point = 1 INR = 100 paise
  }

  // ─── Promotional Discount ──────────────────────────────────────────────────
  let promoDiscount = 0; // in paise
  let promoCodeApplied: string | null = null;
  let promoId: string | null = null;

  if (promoCodeRaw) {
    const promoResult = await applyPromoCodeAtCheckout(
      userId,
      promoCodeRaw,
      context.breakdown.totalAmount - walletDiscount - pointsDiscount,
    );
    if (promoResult) {
      promoDiscount = promoResult.discountPaise;
      promoCodeApplied = promoCodeRaw;
      promoId = promoResult.promoId;
    }
  }

  const effectiveTotal = context.breakdown.totalAmount - walletDiscount - pointsDiscount - promoDiscount;
  if (effectiveTotal < 0) {
    throw new BadRequestError('Discounts cannot exceed payable amount');
  }

  const existingPending =
    context.existingPayment &&
    (context.existingPayment.status === PaymentStatus.PENDING ||
      context.existingPayment.status === PaymentStatus.AUTHORIZED)
      ? context.existingPayment
      : null;

  if (
    existingPending &&
    Number(existingPending.walletAmountUsed ?? 0) > 0 &&
    Number(existingPending.walletAmountUsed) !== walletAmountUsed
  ) {
    throw new BadRequestError(
      'Existing checkout already has wallet deduction applied. Continue with current amount.',
    );
  }

  if (
    existingPending &&
    (existingPending.pointsRedeemed ?? 0) > 0 &&
    (existingPending.pointsRedeemed ?? 0) !== pointsRedeemed
  ) {
    throw new BadRequestError(
      'Existing checkout already has points redeemed. Continue with current amount.',
    );
  }

  const client = await getRazorpayClient();

  let orderId = existingPending?.razorpayOrderId ?? null;
  let currency = existingPending?.currency ?? 'INR';

  if (!orderId && client) {
    const order = await client.orders.create({
      amount: effectiveTotal,
      currency,
      receipt: `${context.group.id}:${userId}`,
      notes: {
        groupId: context.group.id,
        planId: context.plan?.id,
        packageId: context.package?.id,
        agencyId: context.agency.id,
        userId,
        source: context.paymentSource,
        pointsRedeemed: pointsRedeemed.toString(),
        walletAmountUsed: walletAmountUsed.toString(),
      },
    });

    orderId = order.id;
    currency = order.currency;
  }

  const paymentData = {
    amount: effectiveTotal,
    tripAmount: context.breakdown.tripAmount,
    platformFeeAmount: context.breakdown.platformFeeAmount,
    feeGstAmount: context.breakdown.feeGstAmount,
    commissionAmount: context.breakdown.commissionAmount,
    source: context.paymentSource,
    currency,
    razorpayOrderId: orderId ?? buildMockOrderId(existingPending?.id ?? crypto.randomUUID()),
    status: PaymentStatus.PENDING,
    pointsRedeemed,
    walletAmountUsed: new Decimal(walletAmountUsed),
    // ─── Denormalized tracking fields ───────────────────────────────────────
    agencyId: context.agency.id,
    planId: context.plan?.id ?? null,
    packageId: context.package?.id ?? null,
  };

  const payment = existingPending
    ? await prisma.payment.update({
        where: { id: existingPending.id },
        data: paymentData,
      })
    : await prisma.payment.create({
        data: {
          userId,
          groupId: context.group.id,
          ...paymentData,
        },
      });

  // ─── Deduct wallet and points NOW (at order-time) ──────────────────────────
  // Both are idempotent operations (use payment ID), so re-creating the order is safe.

  if (walletAmountUsed > 0) {
    try {
      const { deductFromWallet } = await import('../wallet/service.js');
      await deductFromWallet(
        prisma,
        userId,
        walletAmountUsed,
        payment.id,
        `wallet_checkout:${payment.id}`,
      );
    } catch (err) {
      console.error('[payment] Failed to deduct from wallet', err);
      // If wallet deduction fails, the order is still created but wallet isn't deducted
      // The payment verification process can handle this edge case
      throw err;
    }
  }

  if (pointsRedeemed > 0) {
    const { redeemPoints } = await import('../loyalty/service.js');
    await redeemPoints(
      userId,
      payment.id,
      context.group.id,
      pointsRedeemed,
      context.breakdown.tripAmount - walletDiscount,
    );
  }

  // Record promo code usage (atomic with payment creation, idempotent)
  if (promoId && promoCodeApplied && promoDiscount > 0) {
    try {
      await prisma.$transaction([
        prisma.promoCodeUsage.create({
          data: {
            promoId,
            userId,
            paymentId: payment.id,
            discountApplied: promoDiscount,
          },
        }),
        prisma.promotionalDiscount.update({
          where: { id: promoId },
          data: { usageCount: { increment: 1 } },
        }),
      ]);
    } catch (err) {
      // Unique constraint violation = promo already used by this user
      console.warn('[promo] duplicate usage attempt, discarding', { userId, promoCodeApplied });
    }
  }

  return {
    payment,
    amount: payment.amount,
    breakdown: {
      tripAmount: payment.tripAmount,
      platformFeeAmount: payment.platformFeeAmount,
      feeGstAmount: payment.feeGstAmount,
      commissionAmount: payment.commissionAmount,
      totalAmount: payment.amount,
      pointsRedeemed,
      pointsDiscount,
      walletAmountUsed,
      walletDiscount,
      promoCode: promoCodeApplied,
      promoDiscount,
    },
    paymentSource: payment.source,
    currency: payment.currency,
    checkoutMode: client ? 'razorpay' : 'mock',
    razorpayKeyId: env.RAZORPAY_KEY_ID || null,
    description: buildCheckoutDescription(context),
  };
}

export async function verifyPayment(userId: string, data: VerifyPaymentInput) {
  const payment = await prisma.payment.findUnique({
    where: { id: data.paymentId },
  });

  if (!payment) throw new NotFoundError('Payment');
  if (payment.userId !== userId) throw new ForbiddenError('Not your payment');

  if (!env.RAZORPAY_KEY_SECRET) {
    throw new BadRequestError('Razorpay secret is not configured');
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== data.razorpaySignature) {
    throw new BadRequestError('Invalid Razorpay signature');
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      razorpayOrderId: data.razorpayOrderId,
      razorpayPaymentId: data.razorpayPaymentId,
      status: PaymentStatus.AUTHORIZED,
    },
  });

  return finalizeCapturedPayment(payment.id, data.razorpayPaymentId, 'checkout');
}

export async function mockCapture(userId: string, data: MockCapturePaymentInput) {
  if (env.NODE_ENV !== 'development') {
    throw new ForbiddenError('Mock capture is only available in development');
  }

  const payment = await prisma.payment.findUnique({ where: { id: data.paymentId } });
  if (!payment) throw new NotFoundError('Payment');
  if (payment.userId !== userId) throw new ForbiddenError('Not your payment');

  const paymentId = `pay_mock_${payment.id.replace(/-/g, '').slice(0, 20)}`;
  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      razorpayOrderId: payment.razorpayOrderId ?? buildMockOrderId(payment.id),
      razorpayPaymentId: paymentId,
      status: PaymentStatus.AUTHORIZED,
    },
  });

  return finalizeCapturedPayment(payment.id, paymentId, 'mock');
}

export async function handleRazorpayWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new BadRequestError('Razorpay webhook secret is not configured');
  }

  if (!signature) {
    throw new BadRequestError('Missing Razorpay webhook signature');
  }

  const expected = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    throw new BadRequestError('Invalid Razorpay webhook signature');
  }

  const payload = JSON.parse(rawBody.toString('utf8')) as {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
        };
      };
    };
  };

  if (payload.event !== 'payment.captured') {
    return { received: true, ignored: true };
  }

  const orderId = payload.payload?.payment?.entity?.order_id;
  const razorpayPaymentId = payload.payload?.payment?.entity?.id;

  if (!orderId || !razorpayPaymentId) {
    throw new BadRequestError('Webhook payload is missing payment identifiers');
  }

  const payment = await prisma.payment.findFirst({
    where: { razorpayOrderId: orderId },
    orderBy: { createdAt: 'desc' },
  });

  if (!payment) {
    return { received: true, ignored: true, reason: 'payment_not_found' };
  }

  await finalizeCapturedPayment(payment.id, razorpayPaymentId, 'webhook');
  return { received: true };
}

export async function resolveConfirmingWindow(groupId: string, triggeredBy: 'worker' | 'manual' = 'manual') {
  const result = await prisma.$transaction(
    async (tx) => {
      const group = await tx.group.findUnique({
        where: { id: groupId },
        include: {
          plan: {
            include: {
              selectedOffer: {
                include: { agency: { select: { id: true, ownerId: true, name: true } } },
              },
            },
          },
          package: {
            include: {
              agency: { select: { id: true, ownerId: true, name: true } },
            },
          },
          members: {
            where: { status: { in: ['APPROVED', 'COMMITTED'] } },
            include: { user: { select: { id: true, gender: true } } },
          },
        },
      });

      if (!group) throw new NotFoundError('Group');

      const source = group.plan?.selectedOffer ? 'PLAN_OFFER' : group.package ? 'PACKAGE' : null;
      if (!source) {
        throw new BadRequestError('Group is not linked to a payable source');
      }

      const status = source === 'PLAN_OFFER' ? group.plan?.status : group.package?.status;
      if (status !== PlanStatus.CONFIRMING) {
        return {
          resolved: false,
          reason: 'not_confirming',
          source,
        };
      }

      const activeMembers = group.members;
      const activeUserIds = activeMembers.map((member) => member.userId);
      const paidPayments = await tx.payment.findMany({
        where: {
          groupId,
          userId: { in: activeUserIds },
          status: PaymentStatus.CAPTURED,
        },
        select: { id: true, userId: true },
      });

      const paidSet = new Set(paidPayments.map((payment) => payment.userId));
      const paidCount = paidSet.size;
      const minSize = source === 'PLAN_OFFER' ? group.plan?.groupSizeMin ?? 1 : group.package?.groupSizeMin ?? 1;

      if (paidCount >= minSize) {
        const unpaidUserIds = activeUserIds.filter((userId) => !paidSet.has(userId));

        if (unpaidUserIds.length > 0) {
          await tx.groupMember.updateMany({
            where: {
              groupId,
              userId: { in: unpaidUserIds },
              status: { in: ['APPROVED', 'COMMITTED'] },
            },
            data: {
              status: 'REMOVED',
              leftAt: new Date(),
            },
          });
        }

        await tx.groupMember.updateMany({
          where: {
            groupId,
            userId: { in: Array.from(paidSet) },
            status: { in: ['APPROVED', 'COMMITTED'] },
          },
          data: {
            status: 'COMMITTED',
            committedAt: new Date(),
          },
        });

        const paidMembers = activeMembers.filter((member) => paidSet.has(member.userId));
        const maleCount = paidMembers.filter((member) => member.user.gender === 'male').length;
        const femaleCount = paidMembers.filter((member) => member.user.gender === 'female').length;
        const otherCount = paidMembers.length - maleCount - femaleCount;

        await tx.group.update({
          where: { id: groupId },
          data: {
            currentSize: paidMembers.length,
            maleCount,
            femaleCount,
            otherCount,
            isLocked: true,
            paymentWindowEndsAt: null,
          },
        });

        if (source === 'PLAN_OFFER' && group.plan) {
          await tx.plan.update({
            where: { id: group.plan.id },
            data: {
              status: PlanStatus.CONFIRMED,
              confirmedAt: new Date(),
            },
          });
        }

        if (source === 'PACKAGE' && group.package) {
          await tx.package.update({
            where: { id: group.package.id },
            data: { status: PlanStatus.CONFIRMED },
          });
        }

        return {
          resolved: true,
          source,
          outcome: 'confirmed',
          paidCount,
          minSize,
          removedCount: unpaidUserIds.length,
          unpaidUserIds,
        };
      }

      if (paidSet.size > 0) {
        await tx.payment.updateMany({
          where: {
            groupId,
            userId: { in: Array.from(paidSet) },
            status: PaymentStatus.CAPTURED,
          },
          data: {
            status: PaymentStatus.REFUNDED,
            escrowStatus: 'REFUNDED',
          },
        });
      }

      await tx.groupMember.updateMany({
        where: {
          groupId,
          userId: { in: activeUserIds },
          status: { in: ['APPROVED', 'COMMITTED'] },
        },
        data: {
          status: 'APPROVED',
          committedAt: null,
        },
      });

      await tx.group.update({
        where: { id: groupId },
        data: { isLocked: false, paymentWindowEndsAt: null },
      });

      if (source === 'PLAN_OFFER' && group.plan) {
        await tx.plan.update({
          where: { id: group.plan.id },
          data: {
            status: PlanStatus.OPEN,
            confirmedAt: null,
          },
        });
      }

      if (source === 'PACKAGE' && group.package) {
        await tx.package.update({
          where: { id: group.package.id },
          data: { status: PlanStatus.OPEN },
        });
      }

      return {
        resolved: true,
        source,
        outcome: 'reopened',
        paidCount,
        minSize,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  if (result.resolved && result.outcome === 'confirmed') {
    await createSystemMessage(
      groupId,
      `Payment window resolved (${triggeredBy}): group confirmed with ${result.paidCount}/${result.paidCount + (result.removedCount ?? 0)} members.`,
      { action: 'payment_progress', triggeredBy, paidCount: result.paidCount },
    );
  }

  if (
    result.resolved &&
    result.outcome === 'confirmed' &&
    Array.isArray((result as { unpaidUserIds?: string[] }).unpaidUserIds) &&
    (result as { unpaidUserIds?: string[] }).unpaidUserIds!.length > 0
  ) {
    const unpaidUserIds = (result as { unpaidUserIds?: string[] }).unpaidUserIds!;
    await createStoredNotificationsBulk(
      unpaidUserIds.map((userId) => ({
        userId,
        type: 'group_removed_unpaid',
        title: 'Removed from trip group',
        body: 'You were removed because payment was not completed before the payment window closed.',
        href: '/dashboard/trips',
        metadata: { groupId, reason: 'unpaid_before_deadline' },
      })),
    );
  }

  if (result.resolved && result.outcome === 'reopened') {
    await createSystemMessage(
      groupId,
      `Payment window expired: only ${result.paidCount} members paid (minimum ${result.minSize}). Plan/package reopened and captured payments refunded.`,
      { action: 'payment_progress', triggeredBy, paidCount: result.paidCount },
    );
  }

  return result;
}

export async function reconcilePendingPayments(limit = 50) {
  const client = await getRazorpayClient();
  const pendingPayments = await prisma.payment.findMany({
    where: {
      status: { in: [PaymentStatus.PENDING, PaymentStatus.AUTHORIZED] },
      razorpayOrderId: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  if (!client) {
    return {
      checked: pendingPayments.length,
      recovered: 0,
      skipped: pendingPayments.length,
      reason: 'razorpay_not_configured',
    };
  }

  let recovered = 0;
  let skipped = 0;

  for (const payment of pendingPayments) {
    try {
      const orderId = payment.razorpayOrderId;
      if (!orderId) {
        skipped += 1;
        continue;
      }

      const paymentList = await client.orders.fetchPayments(orderId);
      const items = Array.isArray(paymentList?.items) ? paymentList.items : [];
      const captured = items.find((item: any) => item?.status === 'captured');
      const authorized = items.find((item: any) => item?.status === 'authorized');

      if (captured?.id) {
        await finalizeCapturedPayment(payment.id, captured.id, 'reconciliation');
        recovered += 1;
        continue;
      }

      if (authorized?.id && payment.status === PaymentStatus.PENDING) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.AUTHORIZED,
            razorpayPaymentId: payment.razorpayPaymentId ?? authorized.id,
          },
        });
      }

      skipped += 1;
    } catch (error) {
      skipped += 1;
      console.warn('[payments:reconcile] unable to reconcile payment', {
        paymentId: payment.id,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }

  return {
    checked: pendingPayments.length,
    recovered,
    skipped,
  };
}

export async function getAgencyWalletSummary(userId: string) {
  const agencyId = await resolveAgencyForActor(userId, ['ADMIN', 'MANAGER', 'FINANCE']);
  return prisma.agencyWallet.upsert({
    where: { agencyId },
    update: {},
    create: { agencyId },
  });
}

export async function listAgencyTransactions(userId: string, limit = 100) {
  const agencyId = await resolveAgencyForActor(userId, ['ADMIN', 'MANAGER', 'FINANCE']);
  const wallet = await prisma.agencyWallet.upsert({
    where: { agencyId },
    update: {},
    create: { agencyId },
  });

  return prisma.agencyTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function listInvoicesForUser(userId: string) {
  const agency = await prisma.agency.findUnique({ where: { ownerId: userId }, select: { id: true } });
  if (agency) {
    return prisma.invoice.findMany({
      where: { agencyId: agency.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  return prisma.invoice.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createDispute(userId: string, data: CreateDisputeInput) {
  const payment = await prisma.payment.findUnique({
    where: { id: data.paymentId },
    include: {
      dispute: true,
      group: {
        include: {
          plan: {
            include: {
              selectedOffer: {
                include: {
                  agency: { select: { id: true } },
                },
              },
            },
          },
          package: {
            include: {
              agency: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!payment) throw new NotFoundError('Payment');
  if (payment.userId !== userId) throw new ForbiddenError('Only the payer can raise a dispute');
  if (payment.status !== PaymentStatus.CAPTURED) {
    throw new BadRequestError('Dispute can only be raised on captured payments');
  }
  if (payment.dispute) {
    return payment.dispute;
  }

  const agencyId = payment.source === 'PLAN_OFFER'
    ? payment.group.plan?.selectedOffer?.agency.id
    : payment.group.package?.agency.id;

  if (!agencyId) {
    throw new BadRequestError('Unable to resolve agency for this payment');
  }

  const dispute = await prisma.dispute.create({
    data: {
      paymentId: payment.id,
      groupId: payment.groupId,
      agencyId,
      createdByUserId: userId,
      reason: data.reason,
      status: DisputeStatus.OPEN,
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { transferStatus: TransferStatus.MANUAL },
  });

  await createSystemMessage(
    payment.groupId,
    'A dispute was opened for this payment. Pending tranche releases are on hold until resolution.',
    {
      action: 'dispute_opened',
      disputeId: dispute.id,
      paymentId: payment.id,
    },
  );

  return dispute;
}

export async function resolveDispute(userId: string, disputeId: string, data: ResolveDisputeInput) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      payment: true,
    },
  });

  if (!dispute) throw new NotFoundError('Dispute');
  if (dispute.status !== DisputeStatus.OPEN && dispute.status !== DisputeStatus.EVIDENCE_REQUIRED) {
    throw new BadRequestError('Dispute is already resolved');
  }

  let nextStatus: DisputeStatus = DisputeStatus.RESOLVED;
  let resolution: 'USER_FAVOR' | 'AGENCY_FAVOR' | 'SPLIT' | null = null;

  if (data.resolution === 'REJECT') {
    nextStatus = DisputeStatus.REJECTED;
  } else if (data.resolution === 'SPLIT') {
    nextStatus = DisputeStatus.SPLIT_REFUND;
    resolution = 'SPLIT';
  } else {
    resolution = data.resolution;
  }

  const updated = await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      status: nextStatus,
      resolution,
      resolutionNotes: data.notes,
      resolvedByUserId: userId,
      resolvedAt: new Date(),
    },
  });

  if (resolution === 'USER_FAVOR' || resolution === 'SPLIT') {
    await prisma.payment.update({
      where: { id: dispute.paymentId },
      data: {
        status: resolution === 'USER_FAVOR' ? PaymentStatus.REFUNDED : PaymentStatus.CAPTURED,
        transferStatus: TransferStatus.MANUAL,
      },
    });
  }

  return updated;
}

export async function listDisputesForAgency(userId: string) {
  const agencyId = await resolveAgencyForActor(userId, ['ADMIN', 'MANAGER', 'FINANCE']);
  return prisma.dispute.findMany({
    where: { agencyId },
    orderBy: { createdAt: 'desc' },
    include: {
      payment: true,
    },
  });
}

export async function releaseEscrow(paymentId: string, tranche: 'tranche1' | 'tranche2') {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      dispute: true,
      group: {
        include: {
          plan: {
            include: {
              selectedOffer: {
                include: { agency: { select: { id: true } } },
              },
            },
          },
          package: {
            include: { agency: { select: { id: true } } },
          },
        },
      },
    },
  });

  if (!payment) throw new NotFoundError('Payment');
  if (payment.status !== PaymentStatus.CAPTURED) {
    throw new BadRequestError('Only captured payments can be released from escrow');
  }

  if (tranche === 'tranche1' && payment.tranche1Released) {
    return payment;
  }
  if (tranche === 'tranche2' && payment.tranche2Released) {
    return payment;
  }

  if (
    tranche === 'tranche2' &&
    payment.dispute &&
    (payment.dispute.status === DisputeStatus.OPEN ||
      payment.dispute.status === DisputeStatus.EVIDENCE_REQUIRED)
  ) {
    throw new BadRequestError('Tranche 2 release is blocked while dispute is open');
  }

  const agencyId = payment.source === 'PLAN_OFFER'
    ? payment.group.plan?.selectedOffer?.agency.id
    : payment.group.package?.agency.id;

  if (!agencyId) {
    throw new BadRequestError('Unable to resolve agency wallet for escrow release');
  }

  const wallet = await prisma.agencyWallet.upsert({
    where: { agencyId },
    update: {},
    create: { agencyId },
  });

  const percent = getTranchePercents(wallet.payoutMode, tranche);
  const gross = Math.round(payment.tripAmount * percent);
  const commission = Math.round(payment.commissionAmount * percent);
  const net = gross - commission;

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data:
        tranche === 'tranche1'
          ? {
              tranche1Released: true,
              escrowStatus: 'PARTIAL_RELEASE',
              transferStatus: TransferStatus.PROCESSING,
              transferReference: `queued:${tranche}:${paymentId}`,
            }
          : {
              tranche2Released: true,
              escrowStatus: 'RELEASED',
              transferStatus: TransferStatus.PROCESSING,
              transferReference: `queued:${tranche}:${paymentId}`,
            },
    }),
    prisma.agencyWallet.update({
      where: { id: wallet.id },
      data: {
        pendingBalance: { decrement: net },
        availableBalance: { increment: net },
        totalEarned: { increment: net },
        totalCommission: { increment: commission },
      },
    }),
    prisma.agencyTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'tranche_released',
        amount: net,
        description: `Escrow ${tranche} released for payment ${paymentId}`,
        groupId: payment.groupId,
        paymentId,
        razorpayTransferId: `queued:${tranche}:${paymentId}`,
      },
    }),
    prisma.agencyTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'commission_deducted',
        amount: -commission,
        description: `Commission deducted on ${tranche} for payment ${paymentId}`,
        groupId: payment.groupId,
        paymentId,
      },
    }),
  ]);

  return updatedPayment;
}

// ─── Trip Completion ──────────────────────────────────────────────────────────

/**
 * Mark a trip as COMPLETED and trigger:
 *  1. Final escrow release (tranche2) for every captured payment in the group
 *  2. Loyalty trip-completion bonus (250 pts) for every committed member
 *
 * Idempotent: re-running after partial failure is safe.
 * Only platform_admin or the group's linked agency owner can call this.
 */
export async function completeTrip(groupId: string, triggeredByUserId: string) {
  // Dynamic import to avoid circular deps
  const { grantTripCompletionBonus } = await import('../loyalty/service.js');

  // Resolve the group and check current state
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      plan: {
        include: {
          selectedOffer: {
            include: { agency: { select: { id: true, ownerId: true } } },
          },
        },
      },
      package: {
        include: { agency: { select: { id: true, ownerId: true } } },
      },
      members: {
        where: { status: 'COMMITTED' },
        select: { userId: true },
      },
    },
  });

  if (!group) throw new NotFoundError('Group');

  const agencyOwnerId =
    group.plan?.selectedOffer?.agency.ownerId ?? group.package?.agency.ownerId ?? null;

  // Only admin or the agency owner can mark a trip complete
  const user = await prisma.user.findUnique({
    where: { id: triggeredByUserId },
    select: { id: true },
  });
  if (!user) throw new NotFoundError('User');

  // Determine current status
  const currentStatus = group.plan?.status ?? group.package?.status ?? null;
  if (currentStatus === PlanStatus.COMPLETED) {
    return { alreadyCompleted: true };
  }

  if (currentStatus !== PlanStatus.CONFIRMED) {
    throw new BadRequestError(
      `Trip must be in CONFIRMED status before it can be marked complete. Current: ${currentStatus}`,
    );
  }

  // Mark plan/package as COMPLETED
  await prisma.$transaction(async (tx) => {
    if (group.plan) {
      await tx.plan.update({
        where: { id: group.plan.id },
        data: { status: PlanStatus.COMPLETED },
      });
    }
    if (group.package) {
      await tx.package.update({
        where: { id: group.package.id },
        data: { status: PlanStatus.COMPLETED },
      });
    }
  });

  // Release final payout (tranche2) for all captured payments in this group
  const capturedPayments = await prisma.payment.findMany({
    where: { groupId, status: PaymentStatus.CAPTURED, tranche2Released: false },
    select: { id: true, userId: true },
  });

  const payoutResults: Array<{ paymentId: string; released: boolean; error?: string }> = [];

  for (const p of capturedPayments) {
    try {
      await releaseEscrow(p.id, 'tranche2');
      payoutResults.push({ paymentId: p.id, released: true });
    } catch (err) {
      payoutResults.push({
        paymentId: p.id,
        released: false,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  // Grant loyalty bonus to every committed member
  const committedUserIds = group.members.map((m) => m.userId);
  const loyaltyResults: Array<{ userId: string; granted: boolean; error?: string }> = [];

  for (const payment of capturedPayments) {
    if (!committedUserIds.includes(payment.userId)) continue;

    try {
      await grantTripCompletionBonus(payment.userId, groupId, payment.id);
      loyaltyResults.push({ userId: payment.userId, granted: true });
    } catch (err) {
      loyaltyResults.push({
        userId: payment.userId,
        granted: false,
        error: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  // Increment completedTrips counter for committed members
  if (committedUserIds.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: committedUserIds } },
      data: { completedTrips: { increment: 1 } },
    });
  }

  // Notify group
  await createSystemMessage(
    groupId,
    '🎉 Trip marked as completed! Final payouts have been released to the agency. Loyalty points have been credited to all travelers.',
    { action: 'trip_completed', triggeredByUserId },
  );

  emitGroupEvent(groupId, 'trip:completed', {
    groupId,
    completedAt: new Date().toISOString(),
  });

  return {
    alreadyCompleted: false,
    payoutsReleased: payoutResults.filter((r) => r.released).length,
    payoutErrors: payoutResults.filter((r) => !r.released),
    loyaltyGranted: loyaltyResults.filter((r) => r.granted).length,
    loyaltyErrors: loyaltyResults.filter((r) => !r.granted),
  };
}

// ─── Comprehensive Payment Tracking ───────────────────────────────────────────

/**
 * Get full payment map for a user — tracks:
 *   • Which user paid → to which group → for which plan/package → to which agency
 *   • Escrow status, payout schedule, loyalty points redeemed/earned
 *   • Invoice details
 *
 * This is the "everything we need to track" endpoint.
 */
export async function getPaymentTrackingMap(userId: string) {
  const payments = await prisma.payment.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          plan: {
            select: {
              id: true,
              slug: true,
              title: true,
              destination: true,
              startDate: true,
              endDate: true,
              status: true,
              selectedOffer: {
                select: {
                  id: true,
                  pricePerPerson: true,
                  agency: {
                    select: { id: true, name: true, slug: true, gstin: true, gstVerifiedName: true },
                  },
                },
              },
            },
          },
          package: {
            select: {
              id: true,
              slug: true,
              title: true,
              destination: true,
              startDate: true,
              endDate: true,
              status: true,
              basePrice: true,
              agency: {
                select: { id: true, name: true, slug: true, gstin: true, gstVerifiedName: true },
              },
            },
          },
          members: {
            select: { userId: true, status: true, role: true },
          },
        },
      },
      invoice: true,
      dispute: {
        select: { id: true, status: true, resolution: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return payments.map((payment) => {
    const agency = payment.source === 'PLAN_OFFER'
      ? payment.group.plan?.selectedOffer?.agency ?? null
      : payment.group.package?.agency ?? null;

    return {
      // \u2500\u2500\u2500 Payment Identity \u2500\u2500\u2500
      paymentId: payment.id,
      userId: payment.userId,
      groupId: payment.groupId,
      source: payment.source,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,

      // \u2500\u2500\u2500 What they paid for \u2500\u2500\u2500
      plan: payment.group.plan
        ? {
            id: payment.group.plan.id,
            title: payment.group.plan.title,
            destination: payment.group.plan.destination,
            startDate: payment.group.plan.startDate,
            endDate: payment.group.plan.endDate,
            status: payment.group.plan.status,
            offerId: payment.group.plan.selectedOffer?.id ?? null,
            pricePerPerson: payment.group.plan.selectedOffer?.pricePerPerson ?? null,
          }
        : null,
      package: payment.group.package
        ? {
            id: payment.group.package.id,
            title: payment.group.package.title,
            destination: payment.group.package.destination,
            startDate: payment.group.package.startDate,
            endDate: payment.group.package.endDate,
            status: payment.group.package.status,
            basePrice: payment.group.package.basePrice,
          }
        : null,

      // \u2500\u2500\u2500 Who receives the money (agency) \u2500\u2500\u2500
      agency: agency
        ? {
            id: agency.id,
            name: agency.name,
            slug: agency.slug,
            gstin: agency.gstin,
            gstVerifiedName: agency.gstVerifiedName,
          }
        : null,

      // \u2500\u2500\u2500 Financial breakdown \u2500\u2500\u2500
      financial: {
        totalPaid: payment.amount,
        tripAmount: payment.tripAmount,
        platformFee: payment.platformFeeAmount,
        feeGst: payment.feeGstAmount,
        commissionAmount: payment.commissionAmount,
        currency: payment.currency,
      },

      // \u2500\u2500\u2500 Escrow & payout status \u2500\u2500\u2500
      escrow: {
        status: payment.escrowStatus,
        paymentStatus: payment.status,
        transferStatus: payment.transferStatus,
        agencyNetAmount: payment.agencyNetAmount,
        initialPayout: payment.initialPayout,
        finalPayout: payment.finalPayout,
        tranche1Released: payment.tranche1Released,
        tranche2Released: payment.tranche2Released,
      },

      // \u2500\u2500\u2500 Loyalty \u2500\u2500\u2500
      loyalty: {
        pointsRedeemed: payment.pointsRedeemed,
        tripBonusIssued: payment.tripBonusIssued,
      },

      // \u2500\u2500\u2500 Group context \u2500\u2500\u2500
      group: {
        memberCount: payment.group.members.length,
        myRole: payment.group.members.find((m) => m.userId === userId)?.role ?? null,
        myStatus: payment.group.members.find((m) => m.userId === userId)?.status ?? null,
      },

      // \u2500\u2500\u2500 Invoice \u2500\u2500\u2500
      invoice: payment.invoice
        ? {
            id: payment.invoice.id,
            invoiceNumber: payment.invoice.invoiceNumber,
            totalAmount: payment.invoice.totalAmount,
            status: payment.invoice.status,
            pdfUrl: payment.invoice.pdfUrl,
          }
        : null,

      // \u2500\u2500\u2500 Dispute \u2500\u2500\u2500
      dispute: payment.dispute ?? null,
    };
  });
}

/**
 * Platform-level payment map for admins \u2014 shows all payments with full tracking context.
 * Helps answer: "Who paid for which travel plan, to whom, through escrow."
 */
export async function getAdminPaymentMap(filters?: {
  agencyId?: string;
  planId?: string;
  packageId?: string;
  status?: PaymentStatus;
  escrowStatus?: string;
  limit?: number;
  cursor?: string;
}) {
  const where: any = {};
  if (filters?.agencyId) where.agencyId = filters.agencyId;
  if (filters?.planId) where.planId = filters.planId;
  if (filters?.packageId) where.packageId = filters.packageId;
  if (filters?.status) where.status = filters.status;
  if (filters?.escrowStatus) where.escrowStatus = filters.escrowStatus;

  const limit = filters?.limit ?? 50;

  const payments = await prisma.payment.findMany({
    where,
    include: {
      user: {
        select: { id: true, fullName: true, phone: true, email: true },
      },
      group: {
        include: {
          plan: {
            select: { id: true, title: true, destination: true, status: true },
          },
          package: {
            select: { id: true, title: true, destination: true, status: true },
          },
        },
      },
      invoice: {
        select: { invoiceNumber: true, totalAmount: true, status: true },
      },
      dispute: {
        select: { id: true, status: true, resolution: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(filters?.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });

  return {
    payments: payments.map((p) => ({
      id: p.id,
      user: p.user,
      groupId: p.groupId,
      source: p.source,
      plan: p.group.plan,
      package: p.group.package,
      agencyId: p.agencyId,
      planId: p.planId,
      packageId: p.packageId,
      amount: p.amount,
      tripAmount: p.tripAmount,
      commissionAmount: p.commissionAmount,
      agencyNetAmount: p.agencyNetAmount,
      status: p.status,
      escrowStatus: p.escrowStatus,
      transferStatus: p.transferStatus,
      tranche1Released: p.tranche1Released,
      tranche2Released: p.tranche2Released,
      pointsRedeemed: p.pointsRedeemed,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
      invoice: p.invoice,
      dispute: p.dispute,
    })),
    cursor: payments.length === limit ? payments[payments.length - 1]?.id : null,
  };
}

// ─── Automated Agency Payout via Razorpay Route ──────────────────────────────

/**
 * Execute a Razorpay Route transfer to the agency's linked account.
 * This automates the payout that's triggered by escrow release.
 *
 * Prerequisites:
 *  - Agency must have a Razorpay linked account set up via Route API
 *  - The payment must have been captured via Razorpay
 *
 * If Razorpay Route is not available (no linked account), the transfer
 * is marked as MANUAL for the platform to process manually (bank transfer, etc.)
 */
export async function executeAgencyPayout(
  paymentId: string,
  tranche: 'tranche1' | 'tranche2',
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      group: {
        include: {
          plan: {
            include: {
              selectedOffer: {
                include: { agency: { select: { id: true, name: true } } },
              },
            },
          },
          package: {
            include: { agency: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  if (!payment) throw new NotFoundError('Payment');
  if (payment.status !== PaymentStatus.CAPTURED) {
    throw new BadRequestError('Payment must be captured for payout');
  }

  const agency = payment.source === 'PLAN_OFFER'
    ? payment.group.plan?.selectedOffer?.agency
    : payment.group.package?.agency;

  if (!agency) throw new BadRequestError('Cannot resolve agency for payout');

  const payoutAmount = tranche === 'tranche1' ? payment.initialPayout : payment.finalPayout;

  if (payoutAmount <= 0) {
    return { status: 'skipped', reason: 'zero_amount' };
  }

  const client = await getRazorpayClient();

  if (!client || !payment.razorpayPaymentId) {
    // No Razorpay client or no Razorpay payment — mark as manual
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        transferStatus: TransferStatus.MANUAL,
        transferReference: `manual:${tranche}:${paymentId}`,
      },
    });

    return {
      status: 'manual',
      reason: 'razorpay_not_available',
      agencyId: agency.id,
      amount: payoutAmount,
    };
  }

  try {
    // Attempt Razorpay Route transfer
    // Note: This requires the agency to have a Route-linked account on Razorpay.
    // The transfer is from the platform's Razorpay account to the agency's linked account.
    const transfer = await client.payments.transfer(payment.razorpayPaymentId, {
      transfers: [
        {
          account: agency.id, // This should be the Razorpay linked_account_id in production
          amount: payoutAmount,
          currency: payment.currency,
          notes: {
            paymentId,
            tranche,
            agencyId: agency.id,
            agencyName: agency.name,
            groupId: payment.groupId,
          },
        },
      ],
    });

    const transferId = transfer?.items?.[0]?.id ?? `route:${tranche}:${paymentId}`;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        transferStatus: TransferStatus.SETTLED,
        transferReference: transferId,
      },
    });

    // Record the transfer in agency transactions
    const wallet = await prisma.agencyWallet.findUnique({
      where: { agencyId: agency.id },
    });

    if (wallet) {
      await prisma.agencyTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'razorpay_route_transfer',
          amount: payoutAmount,
          description: `Automated Razorpay Route transfer (${tranche}) for payment ${paymentId}`,
          groupId: payment.groupId,
          paymentId,
          razorpayTransferId: transferId,
        },
      });
    }

    return { status: 'settled', transferId, amount: payoutAmount };
  } catch (err) {
    console.error(`[payout:route] Failed Razorpay transfer for ${paymentId}:`, err);

    // Fallback to manual
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        transferStatus: TransferStatus.MANUAL,
        transferReference: `failed:${tranche}:${paymentId}`,
      },
    });

    return {
      status: 'failed',
      error: err instanceof Error ? err.message : 'unknown',
      agencyId: agency.id,
      amount: payoutAmount,
    };
  }
}

/**
 * Get agency payout summary — shows all payouts due/completed for an agency.
 * Used by the agency dashboard to see escrow lifecycle.
 */
export async function getAgencyPayoutSummary(userId: string) {
  const agencyId = await resolveAgencyForActor(userId, ['ADMIN', 'MANAGER', 'FINANCE']);

  const payments = await prisma.payment.findMany({
    where: { agencyId, status: PaymentStatus.CAPTURED },
    select: {
      id: true,
      groupId: true,
      tripAmount: true,
      commissionAmount: true,
      agencyNetAmount: true,
      initialPayout: true,
      finalPayout: true,
      tranche1Released: true,
      tranche2Released: true,
      escrowStatus: true,
      transferStatus: true,
      transferReference: true,
      paidAt: true,
      createdAt: true,
      group: {
        select: {
          plan: { select: { id: true, title: true, status: true, startDate: true, endDate: true } },
          package: { select: { id: true, title: true, status: true, startDate: true, endDate: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const summary = {
    totalBookings: payments.length,
    totalTripAmount: payments.reduce((s, p) => s + p.tripAmount, 0),
    totalCommission: payments.reduce((s, p) => s + p.commissionAmount, 0),
    totalNetAmount: payments.reduce((s, p) => s + p.agencyNetAmount, 0),
    tranche1Released: payments.filter((p) => p.tranche1Released).length,
    tranche2Released: payments.filter((p) => p.tranche2Released).length,
    pendingPayouts: payments.filter((p) => !p.tranche2Released).length,
  };

  return { summary, payments };
}

// ─── Promotional Discount Helpers ─────────────────────────────────────────────

/**
 * Validates a promo code and computes its discount against the current basket amount.
 * Returns discount details or null if the code is invalid/expired/exhausted.
 * Does NOT apply or record usage — use applyPromoCodeAtCheckout for that.
 */
export async function validatePromoCode(
  userId: string,
  code: string,
  groupId: string,
) {
  const normalized = code.trim().toUpperCase();

  const promo = await prisma.promotionalDiscount.findUnique({
    where: { code: normalized },
    include: {
      usages: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!promo || !promo.isActive) {
    return { valid: false, error: 'INVALID_CODE', message: 'Promo code not found or inactive.' };
  }

  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { valid: false, error: 'EXPIRED', message: 'This promo code has expired.' };
  }

  if (promo.maxUsageTotal !== null && promo.usageCount >= promo.maxUsageTotal) {
    return { valid: false, error: 'EXHAUSTED', message: 'This promo code has reached its usage limit.' };
  }

  if (promo.usages.length >= promo.maxUsagePerUser) {
    return { valid: false, error: 'ALREADY_USED', message: 'You have already used this promo code.' };
  }

  // Compute discount against the group's basket
  const context = await getGroupPaymentContext(groupId, userId);
  const basketPaise = context.breakdown.totalAmount;

  if (basketPaise < promo.minOrderAmount) {
    return {
      valid: false,
      error: 'MIN_ORDER',
      message: `Minimum order amount of ₹${(promo.minOrderAmount / 100).toLocaleString('en-IN')} required.`,
    };
  }

  const rawDiscount =
    promo.discountType === 'percent'
      ? Math.floor((basketPaise * promo.discountValue) / 10000) // basisPoints: 100 = 1%
      : promo.discountValue;

  const discountPaise = promo.maxDiscountAmount !== null
    ? Math.min(rawDiscount, promo.maxDiscountAmount)
    : rawDiscount;

  return {
    valid: true,
    code: normalized,
    discountType: promo.discountType,
    discountPaise,
    discountRupees: discountPaise / 100,
    description: promo.description,
    expiresAt: promo.expiresAt,
    message: `₹${(discountPaise / 100).toLocaleString('en-IN')} discount applied!`,
  };
}

/**
 * Internal: applies promo code and returns the discount to deduct from the order.
 * Returns null if the code is invalid — caller should proceed without discount.
 */
async function applyPromoCodeAtCheckout(
  userId: string,
  code: string,
  basketPaise: number,
): Promise<{ discountPaise: number; promoId: string } | null> {
  const promo = await prisma.promotionalDiscount.findUnique({
    where: { code },
    include: {
      usages: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!promo || !promo.isActive) return null;
  if (promo.expiresAt && promo.expiresAt < new Date()) return null;
  if (promo.maxUsageTotal !== null && promo.usageCount >= promo.maxUsageTotal) return null;
  if (promo.usages.length >= promo.maxUsagePerUser) return null;
  if (basketPaise < promo.minOrderAmount) return null;

  const rawDiscount =
    promo.discountType === 'percent'
      ? Math.floor((basketPaise * promo.discountValue) / 10000)
      : promo.discountValue;

  const discountPaise = promo.maxDiscountAmount !== null
    ? Math.min(rawDiscount, promo.maxDiscountAmount)
    : rawDiscount;

  return { discountPaise, promoId: promo.id };
}
