import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { emitGroupEvent, emitUserEvent } from '../../lib/socket.js';
import { createSystemMessage } from '../chat/service.js';
import { queueNotification, scheduleConfirmingWindow } from '../../lib/queue.js';
import { env } from '../../lib/env.js';
import { createStoredNotification } from '../notifications/service.js';

const PAYMENT_WINDOW_MS = 48 * 60 * 60 * 1000;

function getGenderCounterDelta(
  gender: string | null | undefined,
  direction: 'increment' | 'decrement',
) {
  return {
    maleCount: gender === 'male' ? { [direction]: 1 } : undefined,
    femaleCount: gender === 'female' ? { [direction]: 1 } : undefined,
    otherCount: gender === 'other' || !gender ? { [direction]: 1 } : undefined,
  };
}

function isInactiveMember(status: string): boolean {
  return status === 'LEFT' || status === 'REMOVED';
}

export async function joinGroup(groupId: string, userId: string) {
  const result = await prisma.$transaction(
    async (tx) => {
      const group = await tx.group.findUnique({
        where: { id: groupId },
        include: { plan: true, package: true },
      });
      if (!group) throw new NotFoundError('Group');
      if (group.isLocked) throw new BadRequestError('Group is locked');
      if (group.plan && group.plan.status !== 'OPEN') {
        throw new BadRequestError('Plan is not open for joining');
      }
      if (group.package && group.package.status !== 'OPEN') {
        throw new BadRequestError('Package is not open for joining');
      }

      const maxSize = group.plan?.groupSizeMax ?? group.package?.groupSizeMax ?? 20;
      if (group.currentSize >= maxSize) {
        throw new BadRequestError('Group is full');
      }

      const existing = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
      });
      if (existing && !isInactiveMember(existing.status)) {
        throw new ConflictError('Already in this group');
      }

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundError('User');

      if (group.plan?.genderPref === 'female_only' && user.gender !== 'female') {
        throw new ForbiddenError('This trip is female-only');
      }

      const autoApprove = group.plan?.autoApprove ?? true;
      const status = autoApprove ? 'APPROVED' : 'INTERESTED';

      const member = existing
        ? await tx.groupMember.update({
            where: { id: existing.id },
            data: {
              status,
              joinedAt: new Date(),
              leftAt: null,
              committedAt: null,
            },
          })
        : await tx.groupMember.create({
            data: { groupId, userId, status },
          });

      await tx.group.update({
        where: { id: groupId },
        data: {
          currentSize: { increment: 1 },
          ...getGenderCounterDelta(user.gender, 'increment'),
        },
      });

      const nextSize = group.currentSize + 1;
      const packageMovedToConfirming =
        Boolean(
          group.package &&
            group.package.status === 'OPEN' &&
            nextSize >= (group.package.groupSizeMin ?? 1),
        );

      if (packageMovedToConfirming && group.package) {
        await tx.package.update({
          where: { id: group.package.id },
          data: { status: 'CONFIRMING' },
        });
      }

      return {
        member,
        group,
        user,
        packageMovedToConfirming,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  const isPendingApproval = result.member.status === 'INTERESTED';
  const memberAction = isPendingApproval ? 'requested' : 'joined';

  emitGroupEvent(groupId, 'group:member_updated', {
    action: memberAction,
    groupId,
    userId,
    status: result.member.status,
  });

  await createSystemMessage(
    groupId,
    isPendingApproval
      ? `${result.user.fullName} requested to join the trip.`
      : `${result.user.fullName} joined the trip.`,
    {
      groupId,
      userId,
      action: memberAction,
    },
  );

  if (result.packageMovedToConfirming && result.group.packageId) {
    const runAt = new Date(Date.now() + PAYMENT_WINDOW_MS);
    await prisma.group.update({
      where: { id: groupId },
      data: { paymentWindowEndsAt: runAt },
    });
    await scheduleConfirmingWindow(groupId, runAt);

    await createSystemMessage(
      groupId,
      'Minimum group size reached. Payment window is now open for 48 hours.',
      { groupId, action: 'payment_window_opened' },
    );
  }

  if (result.group.plan?.creatorId && result.group.plan.creatorId !== userId) {
    emitUserEvent(result.group.plan.creatorId, 'group:member_updated', {
      action: memberAction,
      groupId,
      userId,
      status: result.member.status,
    });

    await queueNotification({
      type: 'group_joined',
      title: isPendingApproval
        ? `${result.user.fullName} requested to join your trip`
        : `${result.user.fullName} joined your trip`,
      body: isPendingApproval
        ? `${result.user.fullName} is waiting for approval in ${result.group.plan.title}.`
        : `${result.user.fullName} is now part of ${result.group.plan.title}.`,
      userIds: [result.group.plan.creatorId],
      ctaUrl: `${env.FRONTEND_URL}/dashboard/trips`,
      metadata: { groupId, userId, status: result.member.status },
    });
  }

  return result.member;
}

export async function leaveGroup(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: {
      group: {
        select: {
          paymentWindowEndsAt: true,
        },
      },
    },
  });
  if (!member) throw new NotFoundError('Member');
  if (member.role === 'CREATOR') throw new BadRequestError('Creator cannot leave');
  if (isInactiveMember(member.status)) {
    throw new BadRequestError('Already left this group');
  }
  const hasCapturedPayment = await prisma.payment.findFirst({
    where: {
      groupId,
      userId,
      status: 'CAPTURED',
    },
    select: { id: true },
  });
  if (hasCapturedPayment) {
    throw new BadRequestError('You cannot leave after completing payment');
  }
  if (member.group.paymentWindowEndsAt && new Date() > member.group.paymentWindowEndsAt) {
    throw new BadRequestError('Leave window is closed for this trip');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  await prisma.$transaction([
    prisma.groupMember.update({
      where: { id: member.id },
      data: { status: 'LEFT', leftAt: new Date() },
    }),
    prisma.group.update({
      where: { id: groupId },
      data: {
        currentSize: { decrement: 1 },
        ...getGenderCounterDelta(user?.gender, 'decrement'),
      },
    }),
  ]);

  emitGroupEvent(groupId, 'group:member_updated', {
    action: 'left',
    groupId,
    userId,
  });

  await createSystemMessage(groupId, 'A traveler left the trip.', {
    groupId,
    userId,
    action: 'left',
  });
}

export async function approveJoin(groupId: string, creatorId: string, targetUserId: string) {
  await assertCreator(groupId, creatorId);

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      plan: {
        select: { title: true },
      },
      package: {
        select: { title: true },
      },
    },
  });
  if (!group) throw new NotFoundError('Group');
  if (group.isLocked) throw new BadRequestError('Group is locked');

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
  if (!member) throw new NotFoundError('Member');
  if (member.status !== 'INTERESTED') {
    throw new BadRequestError('Member is not in INTERESTED state');
  }

  const updated = await prisma.groupMember.update({
    where: { id: member.id },
    data: { status: 'APPROVED' },
  });

  emitGroupEvent(groupId, 'group:member_updated', {
    action: 'approved',
    groupId,
    userId: targetUserId,
    status: 'APPROVED',
  });

  await createSystemMessage(groupId, 'A pending traveler was approved to join.', {
    groupId,
    userId: targetUserId,
    action: 'approved',
  });

  emitUserEvent(targetUserId, 'group:member_updated', {
    action: 'approved',
    groupId,
    userId: targetUserId,
    status: 'APPROVED',
  });

  const groupTitle = group.plan?.title ?? group.package?.title ?? 'trip group';
  await createStoredNotification({
    userId: targetUserId,
    type: 'group_join_approved',
    title: `Request approved for ${groupTitle}`,
    body: `Your request to join ${groupTitle} was accepted.`,
    href: `/dashboard/messages?groupId=${encodeURIComponent(groupId)}`,
    metadata: { groupId, userId: targetUserId },
  });

  return updated;
}

export async function inviteMember(groupId: string, creatorId: string, targetUserId: string) {
  await assertCreator(groupId, creatorId);

  const result = await prisma.$transaction(
    async (tx) => {
      const group = await tx.group.findUnique({
        where: { id: groupId },
        include: {
          plan: true,
          package: true,
        },
      });
      if (!group) throw new NotFoundError('Group');
      if (group.isLocked) throw new BadRequestError('Group is locked');
      if (!group.planId || !group.plan) {
        throw new BadRequestError('Only traveler plan groups support creator invites');
      }
      if (group.plan.status !== 'OPEN') {
        throw new BadRequestError('Plan is not open for adding members');
      }

      const maxSize = group.plan.groupSizeMax ?? 20;
      if (group.currentSize >= maxSize) {
        throw new BadRequestError('Group is full');
      }

      const user = await tx.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, fullName: true, gender: true },
      });
      if (!user) throw new NotFoundError('User');

      if (group.plan.genderPref === 'female_only' && user.gender !== 'female') {
        throw new ForbiddenError('This trip is female-only');
      }

      const existing = await tx.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: targetUserId } },
      });
      if (existing && !isInactiveMember(existing.status)) {
        throw new ConflictError('Already in this group');
      }

      const member = existing
        ? await tx.groupMember.update({
            where: { id: existing.id },
            data: {
              role: 'MEMBER',
              status: 'APPROVED',
              joinedAt: new Date(),
              leftAt: null,
              committedAt: null,
            },
          })
        : await tx.groupMember.create({
            data: {
              groupId,
              userId: targetUserId,
              status: 'APPROVED',
            },
          });

      await tx.group.update({
        where: { id: groupId },
        data: {
          currentSize: { increment: 1 },
          ...getGenderCounterDelta(user.gender, 'increment'),
        },
      });

      return {
        member,
        user,
        groupTitle: group.plan.title,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );

  emitGroupEvent(groupId, 'group:member_updated', {
    action: 'invited',
    groupId,
    userId: targetUserId,
    status: 'APPROVED',
  });

  emitUserEvent(targetUserId, 'group:member_updated', {
    action: 'approved',
    groupId,
    userId: targetUserId,
    status: 'APPROVED',
  });

  await createSystemMessage(groupId, `${result.user.fullName} was added to the trip by the creator.`, {
    groupId,
    userId: targetUserId,
    action: 'invited',
  });

  await createStoredNotification({
    userId: targetUserId,
    type: 'group_join_approved',
    title: `You were added to ${result.groupTitle}`,
    body: `The trip creator added you directly to ${result.groupTitle}.`,
    href: `/dashboard/messages?groupId=${encodeURIComponent(groupId)}`,
    metadata: { groupId, userId: targetUserId },
  });

  return result.member;
}

export async function removeMember(groupId: string, creatorId: string, targetUserId: string) {
  await assertCreator(groupId, creatorId);

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      plan: {
        select: { title: true },
      },
      package: {
        select: { title: true },
      },
    },
  });
  if (!group) throw new NotFoundError('Group');

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
  if (!member) throw new NotFoundError('Member');
  if (member.role === 'CREATOR') throw new BadRequestError('Cannot remove the creator');
  if (isInactiveMember(member.status)) {
    throw new BadRequestError('Member is no longer active in this group');
  }

  const user = await prisma.user.findUnique({ where: { id: targetUserId } });

  await prisma.$transaction([
    prisma.groupMember.update({
      where: { id: member.id },
      data: { status: 'REMOVED', leftAt: new Date() },
    }),
    prisma.group.update({
      where: { id: groupId },
      data: {
        currentSize: { decrement: 1 },
        ...getGenderCounterDelta(user?.gender, 'decrement'),
      },
    }),
  ]);

  emitGroupEvent(groupId, 'group:member_updated', {
    action: 'removed',
    groupId,
    userId: targetUserId,
  });

  await createSystemMessage(groupId, 'A traveler was removed from the trip.', {
    groupId,
    userId: targetUserId,
    action: 'removed',
  });

  const groupTitle = group.plan?.title ?? group.package?.title ?? 'trip group';
  await createStoredNotification({
    userId: targetUserId,
    type: 'group_member_removed',
    title: `Removed from ${groupTitle}`,
    body: `The creator removed you from ${groupTitle}.`,
    href: '/dashboard/trips',
    metadata: { groupId, userId: targetUserId },
  });
}

export async function getMembers(groupId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new NotFoundError('Group');

  const members = await prisma.groupMember.findMany({
    where: { groupId, status: { in: ['INTERESTED', 'APPROVED', 'COMMITTED'] } },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          gender: true,
          city: true,
          verification: true,
          avgRating: true,
          completedTrips: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });

  return { group, members };
}

export async function listMyTrips(userId: string) {
  return prisma.groupMember.findMany({
    where: {
      userId,
      status: { in: ['INTERESTED', 'APPROVED', 'COMMITTED'] },
    },
    orderBy: { joinedAt: 'desc' },
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
              coverImageUrl: true,
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
              galleryUrls: true,
              basePrice: true,
            },
          },
        },
      },
    },
  });
}

async function assertCreator(groupId: string, userId: string) {
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member || member.role !== 'CREATOR') {
    throw new ForbiddenError('Only the group creator can perform this action');
  }
}
