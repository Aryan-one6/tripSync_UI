import type { CreateReviewInput } from '@tripsync/shared';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { queueNotification } from '../../lib/queue.js';
import { emitAgencyEvent, emitUserEvent } from '../../lib/socket.js';
import { env } from '../../lib/env.js';
import { syncUserVerificationTier } from '../../lib/verification.js';

async function assertReviewWindow(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      plan: {
        include: {
          selectedOffer: {
            include: {
              agency: {
                select: {
                  id: true,
                  ownerId: true,
                  name: true,
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
              ownerId: true,
              name: true,
            },
          },
        },
      },
      members: {
        where: { status: { in: ['APPROVED', 'COMMITTED'] } },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              avgRating: true,
            },
          },
        },
      },
    },
  });

  if (!group) throw new NotFoundError('Group');

  const endDate = group.plan?.endDate ?? group.package?.endDate ?? null;
  if (!endDate || endDate > new Date()) {
    throw new BadRequestError('Reviews unlock after the trip has ended');
  }

  return group;
}

async function refreshAgencyAggregate(agencyId: string) {
  const [aggregate, totalTrips] = await Promise.all([
    prisma.review.aggregate({
      where: { targetAgencyId: agencyId },
      _avg: { overallRating: true },
      _count: { _all: true },
    }),
    prisma.offer.count({
      where: {
        agencyId,
        status: 'ACCEPTED',
        plan: { status: { in: ['CONFIRMED', 'COMPLETED'] } },
      },
    }),
  ]);

  await prisma.agency.update({
    where: { id: agencyId },
    data: {
      avgRating: aggregate._avg.overallRating ?? 0,
      totalReviews: aggregate._count._all,
      totalTrips,
    },
  });
}

async function refreshUserAggregate(userId: string) {
  const aggregate = await prisma.review.aggregate({
    where: { targetUserId: userId },
    _avg: { overallRating: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      avgRating: aggregate._avg.overallRating ?? 0,
    },
  });

  await syncUserVerificationTier(userId);
}

export async function getEligibility(groupId: string, userId: string) {
  const group = await assertReviewWindow(groupId);

  const membership = group.members.find((member) => member.userId === userId);
  if (!membership) {
    throw new ForbiddenError('Only travelers from this trip can leave reviews');
  }

  const agency = group.plan?.selectedOffer?.agency ?? group.package?.agency ?? null;
  const existing = await prisma.review.findMany({
    where: { reviewerId: userId, groupId },
    select: {
      id: true,
      reviewType: true,
      targetAgencyId: true,
      targetUserId: true,
      overallRating: true,
      safetyRating: true,
      valueRating: true,
      comment: true,
      createdAt: true,
    },
  });

  return {
    groupId,
    agency,
    coTravelers: group.members
      .filter((member) => member.userId !== userId)
      .map((member) => member.user),
    existingReviews: existing,
  };
}

export async function createReview(reviewerId: string, data: CreateReviewInput) {
  const group = await assertReviewWindow(data.groupId);

  const reviewer = group.members.find((member) => member.userId === reviewerId);
  if (!reviewer) {
    throw new ForbiddenError('Only travelers from this trip can leave reviews');
  }

  if (data.reviewType === 'agency') {
    const agency = group.plan?.selectedOffer?.agency ?? group.package?.agency ?? null;
    if (!agency) {
      throw new BadRequestError('This trip has no agency review target');
    }
    if (data.targetAgencyId && data.targetAgencyId !== agency.id) {
      throw new BadRequestError('Agency review target does not match the trip');
    }

    const review = await prisma.review.create({
      data: {
        reviewerId,
        groupId: data.groupId,
        reviewType: data.reviewType,
        targetAgencyId: agency.id,
        overallRating: data.overallRating,
        safetyRating: data.safetyRating,
        valueRating: data.valueRating,
        comment: data.comment,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await refreshAgencyAggregate(agency.id);
    emitAgencyEvent(agency.id, 'review:created', { reviewId: review.id, groupId: data.groupId });
    await queueNotification({
      type: 'review_created',
      title: `New agency review for ${agency.name}`,
      body: `${review.reviewer.fullName} shared a ${review.overallRating}/5 review.`,
      userIds: [agency.ownerId],
      ctaUrl: `${env.FRONTEND_URL}/agency/dashboard`,
      metadata: { reviewId: review.id, groupId: data.groupId },
    });

    return review;
  }

  const targetMember = group.members.find((member) => member.userId === data.targetUserId);
  if (!targetMember) {
    throw new BadRequestError('Co-traveler review target must belong to the same group');
  }
  if (targetMember.userId === reviewerId) {
    throw new BadRequestError('You cannot review yourself');
  }

  const review = await prisma.review.create({
    data: {
      reviewerId,
      groupId: data.groupId,
      reviewType: data.reviewType,
      targetUserId: targetMember.userId,
      overallRating: data.overallRating,
      safetyRating: data.safetyRating,
      valueRating: data.valueRating,
      comment: data.comment,
    },
    include: {
      reviewer: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  await refreshUserAggregate(targetMember.userId);
  emitUserEvent(targetMember.userId, 'review:created', { reviewId: review.id, groupId: data.groupId });
  await queueNotification({
    type: 'review_created',
    title: `New co-traveler review`,
    body: `${review.reviewer.fullName} shared a ${review.overallRating}/5 review.`,
    userIds: [targetMember.userId],
    ctaUrl: `${env.FRONTEND_URL}/dashboard/settings`,
    metadata: { reviewId: review.id, groupId: data.groupId },
  });

  return review;
}

export async function listGroupReviews(groupId: string, userId: string) {
  const group = await assertReviewWindow(groupId);
  const membership = group.members.find((member) => member.userId === userId);
  if (!membership) {
    throw new ForbiddenError('Only travelers from this trip can view these reviews');
  }

  return prisma.review.findMany({
    where: { groupId },
    include: {
      reviewer: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      targetAgency: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      targetUser: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
