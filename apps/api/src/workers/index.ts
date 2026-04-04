import { Worker } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { env } from '../lib/env.js';
import { getRedisConnection } from '../lib/queue.js';
import { releaseEscrow, reconcilePendingPayments, resolveConfirmingWindow } from '../modules/payments/service.js';
import { sendWhatsAppMessage } from '../lib/whatsapp.js';
import { syncUserVerificationTier } from '../lib/verification.js';
import { evaluateAgencyTrustProfiles } from '../modules/agencies/service.js';

const connection = getRedisConnection();

const planExpiryWorker = new Worker(
  'plan-expiry-check',
  async () => {
    const now = new Date();

    const result = await prisma.plan.updateMany({
      where: {
        status: 'OPEN',
        expiresAt: { lt: now },
      },
      data: { status: 'EXPIRED' },
    });

    return { expiredPlans: result.count };
  },
  { connection },
);

const offerExpiryWorker = new Worker(
  'offer-expiry',
  async () => {
    const now = new Date();

    const result = await prisma.offer.updateMany({
      where: {
        status: { in: ['PENDING', 'COUNTERED'] },
        validUntil: { lt: now },
      },
      data: { status: 'WITHDRAWN' },
    });

    return { expiredOffers: result.count };
  },
  { connection },
);

const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const phoneNumbers = new Set<string>(job.data.phoneNumbers ?? []);

    if (job.data.userIds?.length) {
      const users = await prisma.user.findMany({
        where: { id: { in: job.data.userIds }, isActive: true },
        select: { phone: true },
      });

      for (const user of users) {
        phoneNumbers.add(user.phone);
      }
    }

    const recipients = Array.from(phoneNumbers);
    if (recipients.length === 0) {
      console.log(`[notification] ${job.name}`, job.data);
      return { delivered: false, recipients: 0 };
    }

    const results = await Promise.allSettled(
      recipients.map((phoneNumber) =>
        sendWhatsAppMessage({
          phoneNumber,
          title: job.data.title,
          body: job.data.body,
          ctaUrl: job.data.ctaUrl,
        }),
      ),
    );

    const delivered = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - delivered;

    if (failed > 0) {
      const errors = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map((result) => result.reason);
      console.error(`[worker:notifications] ${job.id} partial failure`, errors);
    }

    return { delivered, failed, recipients: recipients.length };
  },
  { connection },
);

const escrowReleaseWorker = new Worker(
  'escrow-release',
  async (job) => {
    return releaseEscrow(job.data.paymentId, job.data.tranche);
  },
  { connection },
);

const confirmingWindowWorker = new Worker(
  'confirming-window',
  async (job) => {
    return resolveConfirmingWindow(job.data.groupId, 'worker');
  },
  { connection },
);

let housekeepingTimer: NodeJS.Timeout | null = null;
let paymentReconciliationTimer: NodeJS.Timeout | null = null;
let trustEvaluationTimer: NodeJS.Timeout | null = null;

async function runHousekeeping() {
  const now = new Date();

  const completedPlans = await prisma.plan.findMany({
    where: {
      status: 'CONFIRMED',
      endDate: { lt: now },
    },
    select: {
      id: true,
      group: {
        select: {
          members: {
            where: { status: 'COMMITTED' },
            select: { userId: true },
          },
        },
      },
    },
  });

  const completedPackages = await prisma.package.findMany({
    where: {
      status: 'CONFIRMED',
      endDate: { lt: now },
    },
    select: {
      id: true,
      group: {
        select: {
          members: {
            where: { status: 'COMMITTED' },
            select: { userId: true },
          },
        },
      },
    },
  });

  await prisma.plan.updateMany({
    where: {
      status: 'OPEN',
      expiresAt: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });

  await prisma.offer.updateMany({
    where: {
      status: { in: ['PENDING', 'COUNTERED'] },
      validUntil: { lt: now },
    },
    data: { status: 'WITHDRAWN' },
  });

  await prisma.plan.updateMany({
    where: {
      status: 'CONFIRMED',
      endDate: { lt: now },
    },
    data: { status: 'COMPLETED' },
  });

  await prisma.package.updateMany({
    where: {
      status: 'CONFIRMED',
      endDate: { lt: now },
    },
    data: { status: 'COMPLETED' },
  });

  const completedUserIds = new Set<string>();

  for (const plan of completedPlans) {
    for (const member of plan.group?.members ?? []) {
      completedUserIds.add(member.userId);
    }
  }

  for (const pkg of completedPackages) {
    for (const member of pkg.group?.members ?? []) {
      completedUserIds.add(member.userId);
    }
  }

  for (const userId of completedUserIds) {
    await prisma.user.update({
      where: { id: userId },
      data: { completedTrips: { increment: 1 } },
    });
    await syncUserVerificationTier(userId);
  }
}

for (const worker of [planExpiryWorker, offerExpiryWorker, notificationWorker, escrowReleaseWorker, confirmingWindowWorker]) {
  worker.on('completed', (job, result) => {
    console.log(`[worker:${worker.name}] job ${job.id} completed`, result);
  });

  worker.on('failed', (job, error) => {
    console.error(`[worker:${worker.name}] job ${job?.id ?? 'unknown'} failed`, error);
  });
}

async function shutdown() {
  if (housekeepingTimer) {
    clearInterval(housekeepingTimer);
  }
  if (paymentReconciliationTimer) {
    clearInterval(paymentReconciliationTimer);
  }
  if (trustEvaluationTimer) {
    clearInterval(trustEvaluationTimer);
  }
  await Promise.all([
    planExpiryWorker.close(),
    offerExpiryWorker.close(),
    notificationWorker.close(),
    escrowReleaseWorker.close(),
    confirmingWindowWorker.close(),
  ]);
  await prisma.$disconnect();
}

process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});

console.log('TravellersIn workers started: plan-expiry-check, offer-expiry');
void runHousekeeping();
void reconcilePendingPayments(100).catch((error) => {
  console.error('[worker:payment-reconciliation:init] failed', error);
});
void evaluateAgencyTrustProfiles().catch((error) => {
  console.error('[worker:agency-trust:init] failed', error);
});
housekeepingTimer = setInterval(() => {
  void runHousekeeping().catch((error) => {
    console.error('[worker:housekeeping] failed', error);
  });
}, env.NODE_ENV === 'development' ? 30_000 : 300_000);

paymentReconciliationTimer = setInterval(
  () => {
    void reconcilePendingPayments(100).catch((error) => {
      console.error('[worker:payment-reconciliation] failed', error);
    });
  },
  env.NODE_ENV === 'development' ? 60_000 : 6 * 60 * 60 * 1000,
);

trustEvaluationTimer = setInterval(
  () => {
    void evaluateAgencyTrustProfiles().catch((error) => {
      console.error('[worker:agency-trust] failed', error);
    });
  },
  env.NODE_ENV === 'development' ? 10 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000,
);
