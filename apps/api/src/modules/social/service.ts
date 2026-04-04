import { Prisma, type PlanStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import { createStoredNotification } from '../notifications/service.js';

const ACTIVE_FEED_STATUSES: PlanStatus[] = ['OPEN', 'CONFIRMING', 'CONFIRMED'];

const feedPlanSelect = Prisma.validator<Prisma.PlanSelect>()({
  id: true,
  slug: true,
  title: true,
  destination: true,
  destinationState: true,
  startDate: true,
  endDate: true,
  budgetMin: true,
  budgetMax: true,
  groupSizeMin: true,
  groupSizeMax: true,
  coverImageUrl: true,
  description: true,
  createdAt: true,
  creator: {
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarUrl: true,
      verification: true,
    },
  },
  group: {
    select: {
      currentSize: true,
    },
  },
});

const feedPackageSelect = Prisma.validator<Prisma.PackageSelect>()({
  id: true,
  slug: true,
  title: true,
  destination: true,
  destinationState: true,
  startDate: true,
  endDate: true,
  basePrice: true,
  groupSizeMin: true,
  groupSizeMax: true,
  galleryUrls: true,
  createdAt: true,
  agency: {
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      verification: true,
    },
  },
  group: {
    select: {
      currentSize: true,
    },
  },
});

const travelerProfileSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  username: true,
  fullName: true,
  avatarUrl: true,
  bio: true,
  city: true,
  travelPreferences: true,
  verification: true,
  avgRating: true,
  completedTrips: true,
  createdPlans: {
    where: { status: { in: ACTIVE_FEED_STATUSES } },
    orderBy: { createdAt: 'desc' },
    take: 12,
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
          { plan: { status: { in: ACTIVE_FEED_STATUSES } } },
          { package: { status: { in: ACTIVE_FEED_STATUSES } } },
        ],
      },
    },
    orderBy: { joinedAt: 'desc' },
    take: 12,
    select: {
      group: {
        select: {
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
    take: 12,
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
});

const agencyProfileSelect = Prisma.validator<Prisma.AgencySelect>()({
  id: true,
  ownerId: true,
  slug: true,
  name: true,
  logoUrl: true,
  description: true,
  city: true,
  state: true,
  verification: true,
  avgRating: true,
  totalTrips: true,
  totalReviews: true,
  destinations: true,
  packages: {
    where: { status: { in: ACTIVE_FEED_STATUSES } },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: {
      id: true,
      slug: true,
      title: true,
      destination: true,
      startDate: true,
      endDate: true,
      status: true,
      basePrice: true,
      galleryUrls: true,
    },
  },
  reviewsReceived: {
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: {
      id: true,
      overallRating: true,
      comment: true,
      createdAt: true,
      reviewer: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  },
});

function serializePlanFeedItem(
  plan: {
    id: string;
    slug: string;
    title: string;
    destination: string;
    destinationState: string | null;
    startDate: Date | null;
    endDate: Date | null;
    budgetMin: number | null;
    budgetMax: number | null;
    groupSizeMin: number;
    groupSizeMax: number;
    coverImageUrl: string | null;
    description: string | null;
    createdAt: Date;
    creator: {
      username: string | null;
      fullName: string;
      avatarUrl: string | null;
      verification: string;
    };
    group: { currentSize: number } | null;
  },
) {
  return {
    id: plan.id,
    slug: plan.slug,
    originType: 'plan' as const,
    title: plan.title,
    destination: plan.destination,
    destinationState: plan.destinationState,
    startDate: plan.startDate?.toISOString() ?? null,
    endDate: plan.endDate?.toISOString() ?? null,
    priceLow: plan.budgetMin,
    priceHigh: plan.budgetMax,
    groupSizeMin: plan.groupSizeMin,
    groupSizeMax: plan.groupSizeMax,
    joinedCount: plan.group?.currentSize ?? 0,
    coverImageUrl: plan.coverImageUrl,
    excerpt: plan.description,
    createdAt: plan.createdAt.toISOString(),
    author: {
      profileType: 'traveler' as const,
      handle: plan.creator.username ?? plan.id,
      name: plan.creator.fullName,
      avatarUrl: plan.creator.avatarUrl,
      verification: plan.creator.verification,
    },
  };
}

function serializePackageFeedItem(
  pkg: {
    id: string;
    slug: string;
    title: string;
    destination: string;
    destinationState: string | null;
    startDate: Date | null;
    endDate: Date | null;
    basePrice: number;
    groupSizeMin: number;
    groupSizeMax: number;
    galleryUrls: unknown;
    createdAt: Date;
    agency: {
      slug: string;
      name: string;
      logoUrl: string | null;
      verification: string;
    };
    group: { currentSize: number } | null;
  },
) {
  const galleryUrls = Array.isArray(pkg.galleryUrls) ? pkg.galleryUrls : [];

  return {
    id: pkg.id,
    slug: pkg.slug,
    originType: 'package' as const,
    title: pkg.title,
    destination: pkg.destination,
    destinationState: pkg.destinationState,
    startDate: pkg.startDate?.toISOString() ?? null,
    endDate: pkg.endDate?.toISOString() ?? null,
    priceLow: pkg.basePrice,
    priceHigh: pkg.basePrice,
    groupSizeMin: pkg.groupSizeMin,
    groupSizeMax: pkg.groupSizeMax,
    joinedCount: pkg.group?.currentSize ?? 0,
    coverImageUrl: typeof galleryUrls[0] === 'string' ? galleryUrls[0] : null,
    excerpt: null,
    createdAt: pkg.createdAt.toISOString(),
    author: {
      profileType: 'agency' as const,
      handle: pkg.agency.slug,
      name: pkg.agency.name,
      avatarUrl: pkg.agency.logoUrl,
      verification: pkg.agency.verification,
    },
  };
}

async function buildFeed(input: {
  planCreatorIds?: string[];
  agencyIds?: string[];
  limit: number;
}) {
  const [plans, packages] = await Promise.all([
    prisma.plan.findMany({
      where: {
        status: { in: ACTIVE_FEED_STATUSES },
        ...(input.planCreatorIds ? { creatorId: { in: input.planCreatorIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      select: feedPlanSelect,
    }),
    prisma.package.findMany({
      where: {
        status: { in: ACTIVE_FEED_STATUSES },
        ...(input.agencyIds ? { agencyId: { in: input.agencyIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      select: feedPackageSelect,
    }),
  ]);

  return [...plans.map(serializePlanFeedItem), ...packages.map(serializePackageFeedItem)]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, input.limit);
}

async function resolveProfileHandle(handle: string) {
  const [user, agency] = await Promise.all([
    prisma.user.findUnique({
      where: { username: handle },
      select: travelerProfileSelect,
    }),
    prisma.agency.findUnique({
      where: { slug: handle },
      select: agencyProfileSelect,
    }),
  ]);

  if (user) {
    return { kind: 'traveler' as const, user };
  }

  if (agency) {
    return { kind: 'agency' as const, agency };
  }

  throw new NotFoundError('Profile');
}

function dedupeDestinations(destinations: Array<string | null | undefined>) {
  return Array.from(new Set(destinations.filter((value): value is string => Boolean(value))));
}

export async function listFeed(limit: number) {
  return buildFeed({ limit });
}

export async function listFollowingFeed(userId: string, limit: number) {
  const follows = await prisma.follow.findMany({
    where: { followerUserId: userId },
    select: {
      targetType: true,
      targetUserId: true,
      targetAgencyId: true,
    },
  });

  const planCreatorIds = follows
    .filter((follow) => follow.targetType === 'USER' && follow.targetUserId)
    .map((follow) => follow.targetUserId!) as string[];
  const agencyIds = follows
    .filter((follow) => follow.targetType === 'AGENCY' && follow.targetAgencyId)
    .map((follow) => follow.targetAgencyId!) as string[];

  if (planCreatorIds.length === 0 && agencyIds.length === 0) {
    return [];
  }

  return buildFeed({ planCreatorIds, agencyIds, limit });
}

export async function getPublicProfile(handle: string) {
  const resolved = await resolveProfileHandle(handle);

  if (resolved.kind === 'traveler') {
    const { user } = resolved;
    const [followerCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { targetUserId: user.id } }),
      prisma.follow.count({ where: { followerUserId: user.id } }),
    ]);

    return {
      profileType: 'traveler' as const,
      handle: user.username!,
      id: user.id,
      name: user.fullName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      travelPreferences: user.travelPreferences,
      location: user.city,
      verification: user.verification,
      followerCount,
      followingCount,
      avgRating: user.avgRating,
      completedTrips: user.completedTrips,
      travelMap: dedupeDestinations([
        ...user.createdPlans.map((plan) => plan.destination),
        ...user.groupMembers.map((membership) => membership.group.plan?.destination ?? membership.group.package?.destination ?? null),
      ]),
      plansCreated: user.createdPlans.map((plan) => ({
        ...plan,
        startDate: plan.startDate?.toISOString() ?? null,
        endDate: plan.endDate?.toISOString() ?? null,
      })),
      tripsJoined: user.groupMembers
        .map((membership) => membership.group.plan ?? membership.group.package)
        .filter(Boolean)
        .map((trip) => ({
          ...trip!,
          startDate: trip!.startDate?.toISOString() ?? null,
          endDate: trip!.endDate?.toISOString() ?? null,
        })),
      reviewsReceived: user.reviewsReceived.map((review) => ({
        ...review,
        createdAt: review.createdAt.toISOString(),
      })),
    };
  }

  const { agency } = resolved;
  const [followerCount, followingCount] = await Promise.all([
    prisma.follow.count({ where: { targetAgencyId: agency.id } }),
    prisma.follow.count({ where: { followerUserId: agency.ownerId } }),
  ]);

  return {
    profileType: 'agency' as const,
    handle: agency.slug,
    id: agency.id,
    ownerId: agency.ownerId,
    name: agency.name,
    avatarUrl: agency.logoUrl,
    bio: agency.description,
    location: [agency.city, agency.state].filter(Boolean).join(', '),
    verification: agency.verification,
    followerCount,
    followingCount,
    avgRating: agency.avgRating,
    totalTrips: agency.totalTrips,
    totalReviews: agency.totalReviews,
    travelMap: dedupeDestinations([
      ...(Array.isArray(agency.destinations) ? agency.destinations.filter((value): value is string => typeof value === 'string') : []),
      ...agency.packages.map((pkg) => pkg.destination),
    ]),
    packages: agency.packages.map((pkg) => ({
      ...pkg,
      startDate: pkg.startDate?.toISOString() ?? null,
      endDate: pkg.endDate?.toISOString() ?? null,
    })),
    reviewsReceived: agency.reviewsReceived.map((review) => ({
      ...review,
      createdAt: review.createdAt.toISOString(),
    })),
  };
}

export async function getFollowState(handle: string, viewerUserId: string) {
  const resolved = await resolveProfileHandle(handle);

  if (resolved.kind === 'traveler') {
    const isOwnProfile = resolved.user.id === viewerUserId;
    const [isFollowing, followerCount, followingCount] = await Promise.all([
      isOwnProfile
        ? Promise.resolve(false)
        : prisma.follow.count({
            where: {
              followerUserId: viewerUserId,
              targetUserId: resolved.user.id,
            },
          }).then((count) => count > 0),
      prisma.follow.count({ where: { targetUserId: resolved.user.id } }),
      prisma.follow.count({ where: { followerUserId: resolved.user.id } }),
    ]);

    return { isFollowing, isOwnProfile, followerCount, followingCount };
  }

  const isOwnProfile = resolved.agency.ownerId === viewerUserId;
  const [isFollowing, followerCount, followingCount] = await Promise.all([
    isOwnProfile
      ? Promise.resolve(false)
      : prisma.follow.count({
          where: {
            followerUserId: viewerUserId,
            targetAgencyId: resolved.agency.id,
          },
        }).then((count) => count > 0),
    prisma.follow.count({ where: { targetAgencyId: resolved.agency.id } }),
    prisma.follow.count({ where: { followerUserId: resolved.agency.ownerId } }),
  ]);

  return { isFollowing, isOwnProfile, followerCount, followingCount };
}

export async function followProfile(handle: string, viewerUserId: string) {
  const resolved = await resolveProfileHandle(handle);
  const viewer = await prisma.user.findUnique({
    where: { id: viewerUserId },
    select: { id: true, username: true, fullName: true },
  });
  if (!viewer) throw new NotFoundError('User');

  if (resolved.kind === 'traveler') {
    if (resolved.user.id === viewerUserId) {
      throw new BadRequestError('You cannot follow your own profile');
    }

    const existing = await prisma.follow.findFirst({
      where: {
        followerUserId: viewerUserId,
        targetUserId: resolved.user.id,
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.follow.create({
        data: {
          followerUserId: viewerUserId,
          targetType: 'USER',
          targetUserId: resolved.user.id,
        },
      });
      await createStoredNotification({
        userId: resolved.user.id,
        type: 'profile_followed',
        title: `${viewer.fullName} started following you`,
        body: 'Your profile gained a new follower.',
        href: `/profile/${viewer.username ?? viewer.id}`,
        metadata: {
          viewerUserId: viewer.id,
          viewerHandle: viewer.username ?? viewer.id,
          targetType: 'traveler',
          targetHandle: resolved.user.username ?? resolved.user.id,
        },
      });
    }
  } else {
    if (resolved.agency.ownerId === viewerUserId) {
      throw new BadRequestError('You cannot follow your own profile');
    }

    const existing = await prisma.follow.findFirst({
      where: {
        followerUserId: viewerUserId,
        targetAgencyId: resolved.agency.id,
      },
      select: { id: true },
    });

    if (!existing) {
      await prisma.follow.create({
        data: {
          followerUserId: viewerUserId,
          targetType: 'AGENCY',
          targetAgencyId: resolved.agency.id,
        },
      });
      await createStoredNotification({
        userId: resolved.agency.ownerId,
        type: 'profile_followed',
        title: `${viewer.fullName} followed your agency`,
        body: `${resolved.agency.name} gained a new follower.`,
        href: `/profile/${viewer.username ?? viewer.id}`,
        metadata: {
          viewerUserId: viewer.id,
          viewerHandle: viewer.username ?? viewer.id,
          targetType: 'agency',
          targetHandle: resolved.agency.slug,
          targetAgencyId: resolved.agency.id,
        },
      });
    }
  }

  return getFollowState(handle, viewerUserId);
}

export async function unfollowProfile(handle: string, viewerUserId: string) {
  const resolved = await resolveProfileHandle(handle);

  if (resolved.kind === 'traveler') {
    await prisma.follow.deleteMany({
      where: {
        followerUserId: viewerUserId,
        targetUserId: resolved.user.id,
      },
    });
  } else {
    await prisma.follow.deleteMany({
      where: {
        followerUserId: viewerUserId,
        targetAgencyId: resolved.agency.id,
      },
    });
  }

  return getFollowState(handle, viewerUserId);
}

export async function recordProfileView(handle: string, viewerUserId: string) {
  const viewer = await prisma.user.findUnique({
    where: { id: viewerUserId },
    select: { id: true, username: true, fullName: true },
  });
  if (!viewer) throw new NotFoundError('User');

  const resolved = await resolveProfileHandle(handle);

  if (resolved.kind === 'traveler') {
    if (resolved.user.id === viewerUserId) {
      return { recorded: false };
    }

    await prisma.profileView.create({
      data: {
        viewerUserId,
        targetOwnerUserId: resolved.user.id,
        targetType: 'USER',
        targetUserId: resolved.user.id,
      },
    });

    await createStoredNotification({
      userId: resolved.user.id,
      type: 'profile_viewed',
      title: `${viewer.fullName} viewed your profile`,
      body: 'Someone checked your traveler profile.',
      href: `/profile/${viewer.username ?? viewer.id}`,
      metadata: {
        viewerUserId: viewer.id,
        viewerHandle: viewer.username ?? viewer.id,
        targetType: 'traveler',
        targetHandle: resolved.user.username ?? resolved.user.id,
      },
    });

    return { recorded: true };
  }

  if (resolved.agency.ownerId === viewerUserId) {
    return { recorded: false };
  }

  await prisma.profileView.create({
    data: {
      viewerUserId,
      targetOwnerUserId: resolved.agency.ownerId,
      targetType: 'AGENCY',
      targetAgencyId: resolved.agency.id,
    },
  });

  await createStoredNotification({
    userId: resolved.agency.ownerId,
    type: 'profile_viewed',
    title: `${viewer.fullName} viewed your agency profile`,
    body: `${resolved.agency.name} received a new profile view.`,
    href: `/profile/${viewer.username ?? viewer.id}`,
    metadata: {
      viewerUserId: viewer.id,
      viewerHandle: viewer.username ?? viewer.id,
      targetType: 'agency',
      targetHandle: resolved.agency.slug,
      targetAgencyId: resolved.agency.id,
    },
  });

  return { recorded: true };
}

// ─── Followers / Following Lists ─────────────────────────────────────────────

export async function getFollowersList(handle: string) {
  const resolved = await resolveProfileHandle(handle);

  const where =
    resolved.kind === 'traveler'
      ? { targetUserId: resolved.user.id }
      : { targetAgencyId: resolved.agency.id };

  const follows = await prisma.follow.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      follower: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  return follows.map((f) => ({
    id: f.follower.id,
    handle: f.follower.username ?? f.follower.id,
    name: f.follower.fullName,
    avatarUrl: f.follower.avatarUrl,
    profileType: 'traveler' as const,
  }));
}

export async function getFollowingList(handle: string) {
  const resolved = await resolveProfileHandle(handle);

  // For agencies, following is tracked by the owner's userId
  const followerUserId =
    resolved.kind === 'traveler' ? resolved.user.id : resolved.agency.ownerId;

  const follows = await prisma.follow.findMany({
    where: { followerUserId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      targetType: true,
      targetUser: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
        },
      },
      targetAgency: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  return follows.map((f) => {
    if (f.targetType === 'USER' && f.targetUser) {
      return {
        id: f.targetUser.id,
        handle: f.targetUser.username ?? f.targetUser.id,
        name: f.targetUser.fullName,
        avatarUrl: f.targetUser.avatarUrl,
        profileType: 'traveler' as const,
      };
    }
    if (f.targetType === 'AGENCY' && f.targetAgency) {
      return {
        id: f.targetAgency.id,
        handle: f.targetAgency.slug,
        name: f.targetAgency.name,
        avatarUrl: f.targetAgency.logoUrl,
        profileType: 'agency' as const,
      };
    }
    return null;
  }).filter(Boolean);
}
