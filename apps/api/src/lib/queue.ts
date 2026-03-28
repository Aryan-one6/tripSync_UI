import { Queue, type ConnectionOptions } from 'bullmq';
import { env } from './env.js';
import { isRedisConfigured } from './redis.js';

export interface NotificationJob {
  type: string;
  title: string;
  body: string;
  userIds?: string[];
  phoneNumbers?: string[];
  ctaUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface EscrowReleaseJob {
  paymentId: string;
  tranche: 'tranche1' | 'tranche2';
}

export function getRedisConnection(): ConnectionOptions {
  if (!env.REDIS_URL) {
    throw new Error('REDIS_URL is required to create a BullMQ connection');
  }

  const redisUrl = new URL(env.REDIS_URL);

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    db: redisUrl.pathname ? Number(redisUrl.pathname.replace('/', '') || '0') : 0,
    tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

const queueingEnabled = isRedisConfigured && !env.VERCEL;
const connection = queueingEnabled ? getRedisConnection() : null;

export const notificationQueue = connection
  ? new Queue<NotificationJob>('notifications', { connection })
  : null;

export const escrowReleaseQueue = connection
  ? new Queue<EscrowReleaseJob>('escrow-release', { connection })
  : null;

export async function queueNotification(job: NotificationJob) {
  if (!notificationQueue) {
    console.log('[queue:notifications:disabled]', job);
    return;
  }

  await notificationQueue.add(job.type, job, {
    removeOnComplete: 200,
    removeOnFail: 200,
  });
}

export async function scheduleEscrowRelease(
  paymentId: string,
  tranche: EscrowReleaseJob['tranche'],
  runAt: Date,
) {
  if (!escrowReleaseQueue) {
    console.log('[queue:escrow-release:disabled]', { paymentId, tranche, runAt });
    return;
  }

  const delay = Math.max(0, runAt.getTime() - Date.now());

  await escrowReleaseQueue.add(
    `escrow:${tranche}`,
    { paymentId, tranche },
    {
      delay,
      jobId: `${paymentId}__${tranche}`,
      removeOnComplete: 200,
      removeOnFail: 200,
    },
  );
}
