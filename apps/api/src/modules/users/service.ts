import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';

const publicUserSelect = {
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  city: true,
  bio: true,
  verification: true,
  avgRating: true,
  completedTrips: true,
} as const;

export async function getPublicProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      ...publicUserSelect,
      createdPlans: {
        where: { status: { in: ['OPEN', 'CONFIRMING', 'CONFIRMED', 'COMPLETED'] } },
        orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          slug: true,
          title: true,
          destination: true,
          destinationState: true,
          startDate: true,
          endDate: true,
          status: true,
          coverImageUrl: true,
        },
      },
      groupMembers: {
        where: {
          status: { in: ['APPROVED', 'COMMITTED'] },
          group: {
            OR: [
              { plan: { status: { in: ['OPEN', 'CONFIRMING', 'CONFIRMED', 'COMPLETED'] } } },
              { package: { status: { in: ['OPEN', 'CONFIRMING', 'CONFIRMED', 'COMPLETED'] } } },
            ],
          },
        },
        orderBy: { joinedAt: 'desc' },
        take: 8,
        select: {
          role: true,
          status: true,
          group: {
            select: {
              id: true,
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
      },
      reviewsReceived: {
        where: { reviewType: 'co_traveler' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          overallRating: true,
          safetyRating: true,
          valueRating: true,
          comment: true,
          createdAt: true,
          reviewer: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              verification: true,
              city: true,
              avgRating: true,
              completedTrips: true,
            },
          },
        },
      },
    },
  });

  if (!user) throw new NotFoundError('User');

  return {
    ...user,
    joinedTrips: user.groupMembers
      .map((membership) => membership.group.plan ?? membership.group.package)
      .filter(Boolean),
  };
}
