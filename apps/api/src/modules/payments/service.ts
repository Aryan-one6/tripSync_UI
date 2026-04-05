import crypto from 'crypto';
import type {
  CreateDisputeInput,
  MockCapturePaymentInput,
  VerifyPaymentInput,
  ResolveDisputeInput,
} from '@tripsync/shared';
import { PaymentStatus, PlanStatus, Prisma, DisputeStatus, WalletPayoutMode, TransferStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../lib/env.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { emitAgencyEvent, emitGroupEvent, emitUserEvent } from '../../lib/socket.js';
import { createSystemMessage } from '../chat/service.js';
import { createStoredNotificationsBulk } from '../notifications/service.js';
import {
  queueNotification,
  scheduleEscrowRelease,
} from '../../lib/queue.js';

let razorpayClientPromise: Promise<any | null> | null = null;

const PLATFORM_FEE_PAISE = 299 * 100;
const FEE_GST_RATE = 0.18;
const COMMISSION_RATE = 0.08;
const PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000;

type PaymentBreakdown = {
  tripAmount: number;
  platformFeeAmount: number;
  feeGstAmount: number;
  commissionAmount: number;
  totalAmount: number;
};

type GroupPaymentContext = Awaited<ReturnType<typeof getGroupPaymentContext>>;

function computePaymentBreakdown(tripAmount: number): PaymentBreakdown {
  const feeGstAmount = Math.round(PLATFORM_FEE_PAISE * FEE_GST_RATE);
  const commissionAmount = Math.round(tripAmount * COMMISSION_RATE);
  return {
    tripAmount,
    platformFeeAmount: PLATFORM_FEE_PAISE,
    feeGstAmount,
    commissionAmount,
    totalAmount: tripAmount + PLATFORM_FEE_PAISE + feeGstAmount,
  };
}

function getTranchePercents(payoutMode: WalletPayoutMode, tranche: 'tranche1' | 'tranche2') {
  if (payoutMode === WalletPayoutMode.PRO) {
    return tranche === 'tranche1' ? 0.3 : 0.32;
  }
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

      if (payment.source === 'PLAN_OFFER' && payment.group.plan) {
        if (allCommitted) {
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
        if (allCommitted) {
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

      if (wallet.payoutMode === WalletPayoutMode.PRO && allCommitted) {
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
        allCommitted,
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
    breakdown: context.breakdown,
    currency: 'INR',
    committedCount,
    travelerCount: context.group.members.length,
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

export async function createOrder(groupId: string, userId: string) {
  const context = await getGroupPaymentContext(groupId, userId);

  if (context.existingPayment?.status === PaymentStatus.CAPTURED) {
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
      },
      paymentSource: context.paymentSource,
      currency: context.existingPayment.currency,
      checkoutMode: 'captured',
      razorpayKeyId: env.RAZORPAY_KEY_ID || null,
    };
  }

  const existingPending =
    context.existingPayment &&
    (context.existingPayment.status === PaymentStatus.PENDING ||
      context.existingPayment.status === PaymentStatus.AUTHORIZED)
      ? context.existingPayment
      : null;

  const client = await getRazorpayClient();

  let orderId = existingPending?.razorpayOrderId ?? null;
  let currency = existingPending?.currency ?? 'INR';

  if (!orderId && client) {
    const order = await client.orders.create({
      amount: context.breakdown.totalAmount,
      currency,
      receipt: `${context.group.id}:${userId}`,
      notes: {
        groupId: context.group.id,
        planId: context.plan?.id,
        packageId: context.package?.id,
        userId,
        source: context.paymentSource,
      },
    });

    orderId = order.id;
    currency = order.currency;
  }

  const paymentData = {
    amount: context.breakdown.totalAmount,
    tripAmount: context.breakdown.tripAmount,
    platformFeeAmount: context.breakdown.platformFeeAmount,
    feeGstAmount: context.breakdown.feeGstAmount,
    commissionAmount: context.breakdown.commissionAmount,
    source: context.paymentSource,
    currency,
    razorpayOrderId: orderId ?? buildMockOrderId(existingPending?.id ?? crypto.randomUUID()),
    status: PaymentStatus.PENDING,
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

  return {
    payment,
    amount: payment.amount,
    breakdown: {
      tripAmount: payment.tripAmount,
      platformFeeAmount: payment.platformFeeAmount,
      feeGstAmount: payment.feeGstAmount,
      commissionAmount: payment.commissionAmount,
      totalAmount: payment.amount,
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
