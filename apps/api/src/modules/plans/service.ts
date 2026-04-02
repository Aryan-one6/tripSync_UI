import { PlanStatus, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { assertTransition } from './state-machine.js';
import type { CreatePlanInput, UpdatePlanInput } from '@tripsync/shared';
import slugifyModule from 'slugify';

const slugify = (slugifyModule as any).default ?? slugifyModule;

function generateSlug(title: string): string {
  const base = slugify(title, { lower: true, strict: true }) as string;
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

function getInitialGenderCounts(gender?: string | null) {
  return {
    maleCount: gender === 'male' ? 1 : 0,
    femaleCount: gender === 'female' ? 1 : 0,
    otherCount: gender === 'other' || !gender ? 1 : 0,
  };
}

export async function create(creatorId: string, data: CreatePlanInput) {
  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { gender: true },
  });
  if (!creator) throw new NotFoundError('User');
  if (data.genderPref === 'female_only' && creator.gender !== 'female') {
    throw new ForbiddenError('Only a female profile can publish a female-only trip');
  }

  const slug = generateSlug(data.title);

  return prisma.$transaction(async (tx) => {
    const plan = await tx.plan.create({
      data: {
        creatorId,
        slug,
        title: data.title,
        destination: data.destination,
        destinationState: data.destinationState,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        isDateFlexible: data.isDateFlexible,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        groupSizeMin: data.groupSizeMin,
        groupSizeMax: data.groupSizeMax,
        vibes: data.vibes,
        accommodation: data.accommodation,
        groupType: data.genderPref === 'female_only' ? 'female_only' : data.groupType,
        genderPref: data.genderPref,
        ageRangeMin: data.ageRangeMin,
        ageRangeMax: data.ageRangeMax,
        activities: data.activities,
        description: data.description,
        itinerary: data.itinerary as any,
        galleryUrls: data.galleryUrls as any,
        coverImageUrl: data.galleryUrls?.[0] ?? data.coverImageUrl,
        autoApprove: data.autoApprove,
        status: PlanStatus.DRAFT,
      },
    });

    await tx.group.create({
      data: {
        planId: plan.id,
        currentSize: 1,
        ...getInitialGenderCounts(creator.gender),
        members: {
          create: {
            userId: creatorId,
            role: 'CREATOR',
            status: 'APPROVED',
          },
        },
      },
    });

    return plan;
  });
}

export async function getById(id: string) {
  const plan = await prisma.plan.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          city: true,
          verification: true,
          avgRating: true,
          completedTrips: true,
        },
      },
      group: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
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
            where: { status: { in: ['INTERESTED', 'APPROVED', 'COMMITTED'] } },
          },
        },
      },
      offers: {
        include: {
          agency: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              avgRating: true,
              verification: true,
            },
          },
        },
        where: { status: { in: ['PENDING', 'COUNTERED', 'ACCEPTED'] } },
      },
      selectedOffer: {
        include: {
          agency: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              avgRating: true,
              verification: true,
            },
          },
        },
      },
    },
  });

  if (!plan) throw new NotFoundError('Plan');
  return plan;
}

export async function getBySlug(slug: string) {
  const plan = await prisma.plan.findUnique({
    where: { slug },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          city: true,
          verification: true,
          avgRating: true,
          completedTrips: true,
        },
      },
      group: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
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
            where: { status: { in: ['INTERESTED', 'APPROVED', 'COMMITTED'] } },
          },
        },
      },
    },
  });

  if (!plan) throw new NotFoundError('Plan');
  return plan;
}

export async function update(planId: string, userId: string, data: UpdatePlanInput) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Plan');
  if (plan.creatorId !== userId) throw new ForbiddenError('Only the creator can update this plan');
  if (plan.status !== PlanStatus.DRAFT) {
    throw new BadRequestError('Can only edit plans in DRAFT status');
  }

  if (data.genderPref === 'female_only') {
    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { gender: true },
    });
    if (!creator || creator.gender !== 'female') {
      throw new ForbiddenError('Only a female profile can publish a female-only trip');
    }
  }

  return prisma.plan.update({
    where: { id: planId },
    data: {
      ...data,
      groupType: data.genderPref === 'female_only' ? 'female_only' : data.groupType,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      itinerary: data.itinerary as any,
      galleryUrls: data.galleryUrls as any,
      coverImageUrl:
        data.galleryUrls !== undefined
          ? data.galleryUrls[0] ?? null
          : data.coverImageUrl,
    },
  });
}

export async function publish(planId: string, userId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Plan');
  if (plan.creatorId !== userId) throw new ForbiddenError('Only the creator can publish');

  assertTransition(plan.status, PlanStatus.OPEN);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  return prisma.plan.update({
    where: { id: planId },
    data: { status: PlanStatus.OPEN, expiresAt },
  });
}

export async function confirm(planId: string, userId: string, offerId: string) {
  const result = await acceptOfferForPlan(planId, offerId, userId);
  return result.plan;
}

export async function acceptOfferForPlan(
  planId: string,
  offerId: string,
  userId: string,
  finalPricePerPerson?: number,
) {
  return prisma.$transaction(
    async (tx) => {
      const plan = await tx.plan.findUnique({ where: { id: planId } });
      if (!plan) throw new NotFoundError('Plan');
      if (plan.creatorId !== userId) throw new ForbiddenError('Only the creator can confirm');

      assertTransition(plan.status, PlanStatus.CONFIRMING);

      const offer = await tx.offer.findUnique({
        where: { id: offerId },
        include: { agency: { select: { ownerId: true } } },
      });
      if (!offer || offer.planId !== planId) throw new NotFoundError('Offer');
      if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
        throw new BadRequestError('Offer is not in an acceptable state');
      }

      const acceptedOfferExists = await tx.offer.findFirst({
        where: {
          planId,
          status: 'ACCEPTED',
          NOT: { id: offerId },
        },
        select: { id: true },
      });
      if (acceptedOfferExists) {
        throw new ConflictError('Another offer has already been accepted for this plan');
      }

      const updatedPlan = await tx.plan.update({
        where: { id: planId },
        data: {
          status: PlanStatus.CONFIRMING,
          selectedOfferId: offerId,
          confirmedAt: null,
        },
      });

      const acceptedOffer = await tx.offer.update({
        where: { id: offerId },
        data: {
          status: 'ACCEPTED',
          ...(typeof finalPricePerPerson === 'number'
            ? { pricePerPerson: finalPricePerPerson }
            : {}),
        },
      });

      await tx.offer.updateMany({
        where: {
          planId,
          id: { not: offerId },
          status: { in: ['PENDING', 'COUNTERED'] },
        },
        data: { status: 'REJECTED' },
      });

      await tx.group.updateMany({
        where: { planId },
        data: { isLocked: true },
      });

      return {
        plan: updatedPlan,
        offer: acceptedOffer,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

export async function cancel(planId: string, userId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Plan');
  if (plan.creatorId !== userId) throw new ForbiddenError('Only the creator can cancel');

  assertTransition(plan.status, PlanStatus.CANCELLED);

  return prisma.plan.update({
    where: { id: planId },
    data: { status: PlanStatus.CANCELLED },
  });
}

export async function listUserPlans(userId: string) {
  return prisma.plan.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      group: { select: { currentSize: true, maleCount: true, femaleCount: true, otherCount: true } },
      _count: { select: { offers: true } },
    },
  });
}

export async function listPlanOffers(planId: string, userId: string) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Plan');

  // Allow: plan creator OR approved/committed group member
  if (plan.creatorId !== userId) {
    const group = await prisma.group.findUnique({ where: { planId }, select: { id: true } });
    if (!group) throw new ForbiddenError('Only the creator can view offers');
    const membership = await prisma.groupMember.findFirst({
      where: { groupId: group.id, userId, status: { in: ['APPROVED', 'COMMITTED'] } },
    });
    if (!membership) throw new ForbiddenError('Only plan members can view offers');
  }

  return prisma.offer.findMany({
    where: { planId },
    include: {
      agency: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          avgRating: true,
          totalReviews: true,
          verification: true,
        },
      },
      negotiations: { orderBy: { round: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
