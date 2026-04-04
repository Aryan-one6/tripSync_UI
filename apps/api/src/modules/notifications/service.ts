import { prisma } from '../../lib/prisma.js';
import { emitUserEvent } from '../../lib/socket.js';
import { NotFoundError } from '../../lib/errors.js';
import { Prisma } from '@prisma/client';

export interface StoredNotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
  read: boolean;
}

export interface RecentProfileViewerPayload {
  id: string;
  createdAt: string;
  targetType: 'traveler' | 'agency';
  targetHandle: string;
  targetName: string;
  viewer: {
    id: string;
    handle: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

export interface CreateStoredNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
}

function toStoredNotificationPayload(notification: {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  metadata: unknown;
  createdAt: Date;
  readAt: Date | null;
}): StoredNotificationPayload {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    href: notification.href,
    metadata:
      notification.metadata && typeof notification.metadata === 'object'
        ? (notification.metadata as Record<string, unknown>)
        : null,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt ? notification.readAt.toISOString() : null,
    read: Boolean(notification.readAt),
  };
}

export async function createStoredNotification(
  input: CreateStoredNotificationInput,
): Promise<StoredNotificationPayload> {
  const created = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  const payload = toStoredNotificationPayload(created);
  emitUserEvent(input.userId, 'notification:created', payload);
  return payload;
}

export async function createStoredNotificationsBulk(
  inputs: CreateStoredNotificationInput[],
): Promise<StoredNotificationPayload[]> {
  const payloads: StoredNotificationPayload[] = [];
  for (const input of inputs) {
    payloads.push(await createStoredNotification(input));
  }
  return payloads;
}

export async function listNotificationsForUser(userId: string, limit: number) {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map(toStoredNotificationPayload);
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  const existing = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, readAt: true },
  });
  if (!existing || existing.userId !== userId) {
    throw new NotFoundError('Notification');
  }
  if (existing.readAt) {
    return { id: existing.id, readAt: existing.readAt.toISOString(), read: true };
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    select: { id: true, readAt: true },
  });

  return { id: updated.id, readAt: updated.readAt?.toISOString() ?? null, read: true };
}

export async function markAllNotificationsAsRead(userId: string) {
  const now = new Date();
  const updated = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: { readAt: now },
  });

  return {
    updatedCount: updated.count,
    readAt: now.toISOString(),
  };
}

export async function listRecentProfileViewsForOwner(userId: string, limit: number) {
  const views = await prisma.profileView.findMany({
    where: { targetOwnerUserId: userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      viewer: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          username: true,
          fullName: true,
        },
      },
      targetAgency: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });

  return views.map((view): RecentProfileViewerPayload => ({
    id: view.id,
    createdAt: view.createdAt.toISOString(),
    targetType: view.targetType === 'AGENCY' ? 'agency' : 'traveler',
    targetHandle:
      view.targetType === 'AGENCY'
        ? (view.targetAgency?.slug ?? view.targetAgencyId ?? 'agency')
        : (view.targetUser?.username ?? view.targetUserId ?? 'profile'),
    targetName:
      view.targetType === 'AGENCY'
        ? (view.targetAgency?.name ?? 'Agency profile')
        : (view.targetUser?.fullName ?? 'Traveler profile'),
    viewer: {
      id: view.viewer.id,
      handle: view.viewer.username ?? view.viewer.id,
      fullName: view.viewer.fullName,
      avatarUrl: view.viewer.avatarUrl,
    },
  }));
}

export async function notifyFollowersOfTravelerPost(input: {
  creatorId: string;
  creatorName: string;
  postTitle: string;
  postHref: string;
  postType: 'plan' | 'package';
}) {
  const follows = await prisma.follow.findMany({
    where: { targetUserId: input.creatorId },
    select: { followerUserId: true },
  });
  const userIds = Array.from(new Set(follows.map((item) => item.followerUserId)));
  if (userIds.length === 0) return;

  await createStoredNotificationsBulk(
    userIds.map((userId) => ({
      userId,
      type: 'followed_post_published',
      title: `${input.creatorName} published a new ${input.postType}`,
      body: input.postTitle,
      href: input.postHref,
      metadata: {
        creatorId: input.creatorId,
        postType: input.postType,
      },
    })),
  );
}

export async function notifyFollowersOfAgencyPost(input: {
  agencyId: string;
  agencyName: string;
  postTitle: string;
  postHref: string;
  postType: 'plan' | 'package';
}) {
  const follows = await prisma.follow.findMany({
    where: { targetAgencyId: input.agencyId },
    select: { followerUserId: true },
  });
  const userIds = Array.from(new Set(follows.map((item) => item.followerUserId)));
  if (userIds.length === 0) return;

  await createStoredNotificationsBulk(
    userIds.map((userId) => ({
      userId,
      type: 'followed_post_published',
      title: `${input.agencyName} published a new ${input.postType}`,
      body: input.postTitle,
      href: input.postHref,
      metadata: {
        agencyId: input.agencyId,
        postType: input.postType,
      },
    })),
  );
}
