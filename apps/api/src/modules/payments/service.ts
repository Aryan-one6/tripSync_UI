import crypto from 'crypto';
import type { MockCapturePaymentInput, VerifyPaymentInput } from '@tripsync/shared';
import { PlanStatus, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../lib/env.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { emitAgencyEvent, emitGroupEvent, emitUserEvent } from '../../lib/socket.js';
import { createSystemMessage } from '../chat/service.js';
import { queueNotification, scheduleEscrowRelease } from '../../lib/queue.js';

let razorpayClientPromise: Promise<any | null> | null = null;

type GroupPaymentContext = Awaited<ReturnType<typeof getGroupPaymentContext>>;

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
                    },
                  },
                },
              },
            },
          },
          package: true,
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

  if (!membership.group.plan || !membership.group.plan.selectedOffer) {
    throw new BadRequestError('Payment opens after an offer is accepted for the plan');
  }

  if (
    membership.group.plan.status !== PlanStatus.CONFIRMING &&
    membership.group.plan.status !== PlanStatus.CONFIRMED
  ) {
    throw new BadRequestError('This trip is not in a payable state');
  }

  const amount = membership.group.plan.selectedOffer.pricePerPerson * 100;
  const existingPayment =
    membership.group.payments.find((payment) => payment.userId === userId) ?? null;

  return {
    membership,
    group: membership.group,
    plan: membership.group.plan,
    offer: membership.group.plan.selectedOffer,
    agency: membership.group.plan.selectedOffer.agency,
    amount,
    existingPayment,
  };
}

function buildCheckoutDescription(context: GroupPaymentContext) {
  return `${context.plan.title} · ${context.agency.name}`;
}

function buildMockOrderId(paymentId: string) {
  return `order_mock_${paymentId.replace(/-/g, '').slice(0, 20)}`;
}

async function finalizeCapturedPayment(
  paymentId: string,
  razorpayPaymentId?: string,
  signalSource: 'checkout' | 'webhook' | 'mock' = 'checkout',
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
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!payment) throw new NotFoundError('Payment');
      if (!payment.group.plan || !payment.group.plan.selectedOffer) {
        throw new BadRequestError('Payment is not linked to a confirming plan');
      }

      if (payment.status === PaymentStatus.CAPTURED) {
        return {
          payment,
          plan: payment.group.plan,
          agency: payment.group.plan.selectedOffer.agency,
          user: payment.user,
          alreadyCaptured: true,
          allCommitted: payment.group.plan.status === PlanStatus.CONFIRMED,
          startDate: payment.group.plan.startDate,
          endDate: payment.group.plan.endDate,
          groupId: payment.groupId,
        };
      }

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CAPTURED,
          razorpayPaymentId: razorpayPaymentId ?? payment.razorpayPaymentId,
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

      const updatedPlan = allCommitted
        ? await tx.plan.update({
            where: { id: payment.group.plan.id },
            data: {
              status: PlanStatus.CONFIRMED,
              confirmedAt: new Date(),
            },
          })
        : payment.group.plan;

      return {
        payment: updatedPayment,
        plan: updatedPlan,
        agency: payment.group.plan.selectedOffer.agency,
        user: payment.user,
        alreadyCaptured: false,
        allCommitted,
        startDate: payment.group.plan.startDate,
        endDate: payment.group.plan.endDate,
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
    { paymentId, status: 'CAPTURED' },
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
    planId: result.plan.id,
    status: 'CAPTURED',
  });

  emitUserEvent(result.plan.creatorId, 'payment:captured', {
    paymentId,
    groupId: result.groupId,
    planId: result.plan.id,
    status: 'CAPTURED',
  });

  await queueNotification({
    type: 'payment_captured',
    title: `${actorName} completed payment`,
    body: `${result.plan.title} moved one step closer to confirmation.`,
    userIds: [result.plan.creatorId, result.agency.ownerId],
    phoneNumbers: result.user?.phone ? [result.user.phone] : undefined,
    ctaUrl: `${env.FRONTEND_URL}/dashboard/groups/${result.groupId}/checkout`,
    metadata: { paymentId, groupId: result.groupId, planId: result.plan.id },
  });

  if (result.allCommitted) {
    await createSystemMessage(
      result.groupId,
      'All approved travelers have paid. The trip is now confirmed.',
      { planId: result.plan.id, status: 'CONFIRMED' },
    );

    emitGroupEvent(result.groupId, 'payment:plan_confirmed', {
      groupId: result.groupId,
      planId: result.plan.id,
      status: 'CONFIRMED',
    });

    emitAgencyEvent(result.agency.id, 'payment:plan_confirmed', {
      groupId: result.groupId,
      planId: result.plan.id,
      status: 'CONFIRMED',
    });

    emitUserEvent(result.plan.creatorId, 'payment:plan_confirmed', {
      groupId: result.groupId,
      planId: result.plan.id,
      status: 'CONFIRMED',
    });

    await queueNotification({
      type: 'trip_confirmed',
      title: `${result.plan.title} is confirmed`,
      body: `Every approved traveler has paid. Group chat and post-confirmation coordination are now live.`,
      userIds: [result.plan.creatorId, result.agency.ownerId],
      ctaUrl: `${env.FRONTEND_URL}/dashboard/groups/${result.groupId}/chat`,
      metadata: { groupId: result.groupId, planId: result.plan.id },
    });
  }

  if (result.startDate) {
    await scheduleEscrowRelease(paymentId, 'tranche1', result.startDate);
  }

  if (result.endDate) {
    await scheduleEscrowRelease(paymentId, 'tranche2', result.endDate);
  }

  return result.payment;
}

export async function getGroupPaymentState(groupId: string, userId: string) {
  const context = await getGroupPaymentContext(groupId, userId);
  const committedCount = context.group.members.filter((member) => member.status === 'COMMITTED').length;

  return {
    groupId,
    plan: {
      id: context.plan.id,
      title: context.plan.title,
      slug: context.plan.slug,
      status: context.plan.status,
    },
    offer: {
      id: context.offer.id,
      agencyName: context.agency.name,
      pricePerPerson: context.offer.pricePerPerson,
    },
    payment: context.existingPayment,
    amount: context.amount,
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
        },
      },
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

  if (!orderId) {
    if (client) {
      const order = await client.orders.create({
        amount: context.amount,
        currency,
        receipt: `${context.group.id}:${userId}`,
        notes: {
          groupId: context.group.id,
          planId: context.plan.id,
          userId,
        },
      });

      orderId = order.id;
      currency = order.currency;
    }
  }

  const payment =
    existingPending &&
    existingPending.amount === context.amount &&
    existingPending.razorpayOrderId === orderId
      ? existingPending
      : existingPending
        ? await prisma.payment.update({
            where: { id: existingPending.id },
            data: {
              amount: context.amount,
              currency,
              razorpayOrderId: orderId ?? buildMockOrderId(existingPending.id),
              status: PaymentStatus.PENDING,
            },
          })
        : await prisma.payment.create({
            data: {
              userId,
              groupId: context.group.id,
              amount: context.amount,
              currency,
              razorpayOrderId: orderId ?? buildMockOrderId(crypto.randomUUID()),
              status: PaymentStatus.PENDING,
            },
          });

  const resolvedOrderId = payment.razorpayOrderId ?? buildMockOrderId(payment.id);
  if (!payment.razorpayOrderId) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { razorpayOrderId: resolvedOrderId },
    });
  }

  return {
    payment: {
      ...payment,
      razorpayOrderId: resolvedOrderId,
    },
    amount: payment.amount,
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
    throw new NotFoundError('Payment');
  }

  await finalizeCapturedPayment(payment.id, razorpayPaymentId, 'webhook');
  return { received: true };
}

export async function releaseEscrow(paymentId: string, tranche: 'tranche1' | 'tranche2') {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
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

  return prisma.payment.update({
    where: { id: paymentId },
    data:
      tranche === 'tranche1'
        ? {
            tranche1Released: true,
            escrowStatus: 'PARTIAL_RELEASE',
          }
        : {
            tranche2Released: true,
            escrowStatus: 'RELEASED',
          },
  });
}
