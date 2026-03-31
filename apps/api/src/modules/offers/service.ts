import { OfferStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import type { CounterOfferInput, CreateOfferInput } from '@tripsync/shared';
import { acceptOfferForPlan } from '../plans/service.js';
import { emitAgencyEvent, emitGroupEvent, emitUserEvent } from '../../lib/socket.js';
import { queueNotification } from '../../lib/queue.js';
import { createSystemMessage } from '../chat/service.js';
import { env } from '../../lib/env.js';

const MAX_NEGOTIATION_ROUNDS = 3;

export async function submitOffer(userId: string, data: CreateOfferInput) {
  const agency = await prisma.agency.findUnique({ where: { ownerId: userId } });
  if (!agency) throw new ForbiddenError('Agency access required');

  const plan = await prisma.plan.findUnique({ where: { id: data.planId } });
  if (!plan) throw new NotFoundError('Plan');
  if (plan.status !== 'OPEN') throw new BadRequestError('Plan is not accepting offers');

  const existing = await prisma.offer.findUnique({
    where: { planId_agencyId: { planId: data.planId, agencyId: agency.id } },
    include: {
      negotiations: {
        select: { id: true },
        take: 1,
      },
    },
  });

  const offerData = {
    pricePerPerson: data.pricePerPerson,
    pricingTiers: data.pricingTiers as any,
    inclusions: data.inclusions as any,
    itinerary: data.itinerary as any,
    cancellationPolicy: data.cancellationPolicy,
    validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    status: OfferStatus.PENDING,
  };

  if (existing) {
    const isUnansweredReferral =
      existing.isReferred &&
      existing.pricePerPerson === 0 &&
      existing.negotiations.length === 0 &&
      (existing.status === OfferStatus.PENDING || existing.status === OfferStatus.COUNTERED);

    if (!isUnansweredReferral) {
      throw new ConflictError('You already have an offer on this plan');
    }

    const updated = await prisma.offer.update({
      where: { id: existing.id },
      data: offerData,
      include: {
        agency: { select: { id: true, name: true, slug: true, logoUrl: true, avgRating: true } },
      },
    });

    const group = await prisma.group.findUnique({
      where: { planId: data.planId },
      select: { id: true },
    });

    emitUserEvent(plan.creatorId, 'offer:created', {
      offerId: updated.id,
      planId: data.planId,
      agencyId: agency.id,
    });
    if (group) {
      emitGroupEvent(group.id, 'offer:created', updated);
    }

    return updated;
  }

  const offer = await prisma.offer.create({
    data: {
      planId: data.planId,
      agencyId: agency.id,
      ...offerData,
    },
    include: {
      agency: { select: { id: true, name: true, slug: true, logoUrl: true, avgRating: true } },
    },
  });

  const group = await prisma.group.findUnique({
    where: { planId: data.planId },
    select: { id: true },
  });

  emitUserEvent(plan.creatorId, 'offer:created', {
    offerId: offer.id,
    planId: data.planId,
    agencyId: agency.id,
  });
  if (group) {
    emitGroupEvent(group.id, 'offer:created', offer);
  }

  await queueNotification({
    type: 'offer_submitted',
    title: `${agency.name} sent a new offer`,
    body: `${agency.name} quoted a new price for ${plan.title}.`,
    userIds: [plan.creatorId],
    ctaUrl: `${env.FRONTEND_URL}/dashboard/plans`,
    metadata: { offerId: offer.id, planId: plan.id },
  });

  return offer;
}

export async function getById(id: string, userId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      agency: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          avgRating: true,
          ownerId: true,
        },
      },
      negotiations: { orderBy: { round: 'asc' } },
      plan: { select: { id: true, title: true, creatorId: true } },
    },
  });

  if (!offer) throw new NotFoundError('Offer');
  if (offer.plan.creatorId !== userId && offer.agency.ownerId !== userId) {
    throw new ForbiddenError('Not authorized to view this offer');
  }

  const { agency, ...rest } = offer;
  return {
    ...rest,
    agency: {
      id: agency.id,
      name: agency.name,
      slug: agency.slug,
      logoUrl: agency.logoUrl,
      avgRating: agency.avgRating,
    },
  };
}

export async function listAgencyOffers(userId: string) {
  const agency = await prisma.agency.findUnique({ where: { ownerId: userId } });
  if (!agency) throw new ForbiddenError('Agency access required');

  return prisma.offer.findMany({
    where: { agencyId: agency.id },
    include: {
      plan: {
        select: {
          id: true,
          slug: true,
          title: true,
          destination: true,
          budgetMin: true,
          budgetMax: true,
          startDate: true,
          endDate: true,
          status: true,
          creator: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      },
      negotiations: { orderBy: { round: 'asc' } },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function counterOffer(offerId: string, userId: string, data: CounterOfferInput) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { plan: true, agency: true, negotiations: true },
  });

  if (!offer) throw new NotFoundError('Offer');
  if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
    throw new BadRequestError('Offer cannot be negotiated in current state');
  }

  const isCreator = offer.plan.creatorId === userId;
  const isAgency = offer.agency.ownerId === userId;
  if (!isCreator && !isAgency) throw new ForbiddenError('Not authorized to negotiate this offer');

  const senderType = isCreator ? 'user' : 'agency';
  const currentRound = offer.negotiations.length + 1;
  if (currentRound > MAX_NEGOTIATION_ROUNDS) {
    throw new BadRequestError(`Maximum ${MAX_NEGOTIATION_ROUNDS} negotiation rounds reached`);
  }

  const lastNeg = offer.negotiations[offer.negotiations.length - 1];
  if (lastNeg && lastNeg.senderType === senderType) {
    throw new BadRequestError('Waiting for the other party to respond');
  }

  const [negotiation] = await prisma.$transaction([
    prisma.offerNegotiation.create({
      data: {
        offerId,
        round: currentRound,
        senderType,
        price: data.price,
        inclusionsDelta: data.inclusionsDelta as any,
        message: data.message,
      },
    }),
    prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.COUNTERED,
        pricePerPerson: data.price ?? offer.pricePerPerson,
      },
    }),
  ]);

  // Post a system message in the group chat
  const group = await prisma.group.findUnique({
    where: { planId: offer.planId },
    select: { id: true },
  });
  if (group) {
    const counterByLabel = senderType === 'user' ? 'The trip creator' : offer.agency.name;
    const counterPrice = data.price ? `₹${data.price.toLocaleString('en-IN')}/person` : 'same price';
    await createSystemMessage(
      group.id,
      `${counterByLabel} countered the offer at ${counterPrice}.`,
      { offerId, planId: offer.planId, round: currentRound, action: 'offer_countered' },
    );
    emitGroupEvent(group.id, 'offer:countered', { offerId, planId: offer.planId, round: currentRound });
  }

  emitUserEvent(offer.plan.creatorId, 'offer:countered', {
    offerId,
    planId: offer.planId,
    round: currentRound,
  });
  emitAgencyEvent(offer.agencyId, 'offer:countered', {
    offerId,
    planId: offer.planId,
    round: currentRound,
  });

  return negotiation;
}

export async function accept(offerId: string, userId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { plan: true },
  });

  if (!offer) throw new NotFoundError('Offer');
  if (offer.plan.creatorId !== userId) throw new ForbiddenError('Only the plan creator can accept');

  const result = await acceptOfferForPlan(offer.planId, offerId, userId);

  const group = await prisma.group.findUnique({
    where: { planId: offer.planId },
    select: { id: true },
  });

  if (group) {
    await createSystemMessage(
      group.id,
      'An agency offer was accepted. Payment collection is now open for approved travelers.',
      { planId: offer.planId, offerId },
    );

    emitGroupEvent(group.id, 'offer:updated', {
      action: 'accepted',
      offerId,
      planId: offer.planId,
      status: 'ACCEPTED',
    });
  }

  emitAgencyEvent(result.offer.agencyId, 'offer:updated', {
    action: 'accepted',
    offerId,
    planId: offer.planId,
    status: 'ACCEPTED',
  });

  return result.offer;
}

export async function reject(offerId: string, userId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { plan: true },
  });

  if (!offer) throw new NotFoundError('Offer');
  if (offer.plan.creatorId !== userId) throw new ForbiddenError('Only the plan creator can reject');
  if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
    throw new BadRequestError('Offer cannot be rejected in current state');
  }

  const rejected = await prisma.offer.update({
    where: { id: offerId },
    data: { status: OfferStatus.REJECTED },
  });

  // Post a system message in the group chat
  const group = await prisma.group.findUnique({
    where: { planId: offer.planId },
    select: { id: true },
  });
  if (group) {
    await createSystemMessage(
      group.id,
      'An offer was declined.',
      { offerId, planId: offer.planId, action: 'offer_rejected' },
    );
    emitGroupEvent(group.id, 'offer:rejected', { offerId, planId: offer.planId, status: 'REJECTED' });
  }

  emitAgencyEvent(offer.agencyId, 'offer:rejected', {
    offerId,
    planId: offer.planId,
    status: 'REJECTED',
  });

  return rejected;
}

export async function withdraw(offerId: string, userId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { agency: true, plan: true },
  });

  if (!offer) throw new NotFoundError('Offer');
  if (offer.agency.ownerId !== userId) throw new ForbiddenError('Only the agency can withdraw');
  if (offer.status === 'ACCEPTED' || offer.status === 'REJECTED') {
    throw new BadRequestError('Cannot withdraw a finalized offer');
  }

  const withdrawn = await prisma.offer.update({
    where: { id: offerId },
    data: { status: OfferStatus.WITHDRAWN },
  });

  emitUserEvent(offer.plan.creatorId, 'offer:updated', {
    action: 'withdrawn',
    offerId,
    planId: offer.planId,
    status: 'WITHDRAWN',
  });

  return withdrawn;
}
