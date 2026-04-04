import { OfferStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import type { CounterOfferInput, CreateOfferInput } from '@tripsync/shared';
import { acceptOfferForPlan } from '../plans/service.js';
import { emitAgencyEvent, emitGroupEvent, emitUserEvent } from '../../lib/socket.js';
import { queueNotification, scheduleConfirmingWindow } from '../../lib/queue.js';
import { createDirectConversation, createSystemMessage, sendDirectMessage } from '../chat/service.js';
import { env } from '../../lib/env.js';

const MAX_NEGOTIATION_ROUNDS = 3;

async function resolveAgencyActor(
  userId: string,
  allowedRoles: Array<'ADMIN' | 'MANAGER' | 'AGENT' | 'FINANCE'>,
) {
  const owned = await prisma.agency.findUnique({ where: { ownerId: userId } });
  if (owned) return owned;

  const member = await prisma.agencyMember.findFirst({
    where: {
      userId,
      isActive: true,
      role: { in: allowedRoles },
    },
    include: {
      agency: true,
    },
  });
  if (!member) throw new ForbiddenError('Agency access required');
  return member.agency;
}

async function postOfferUpdateToDirectChat(
  senderUserId: string,
  recipientUserId: string,
  content: string,
) {
  try {
    const conversation = await createDirectConversation(senderUserId, {
      targetUserId: recipientUserId,
    });

    await sendDirectMessage(conversation.id, senderUserId, { content });
  } catch (error) {
    // Offer lifecycle should not fail just because DM bootstrap fails.
    console.warn('[offers] unable to mirror update to direct chat', {
      senderUserId,
      recipientUserId,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
}

export async function submitOffer(userId: string, data: CreateOfferInput) {
  const agency = await resolveAgencyActor(userId, ['ADMIN', 'MANAGER', 'AGENT']);

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
    cancellationRules: data.cancellationRules as any,
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

    await postOfferUpdateToDirectChat(
      userId,
      plan.creatorId,
      `We updated our offer for "${plan.title}" to ₹${updated.pricePerPerson.toLocaleString('en-IN')}/person.`,
    );

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

  await postOfferUpdateToDirectChat(
    userId,
    plan.creatorId,
    `We sent an offer for "${plan.title}" at ₹${offer.pricePerPerson.toLocaleString('en-IN')}/person.`,
  );

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
  const agency = await resolveAgencyActor(userId, ['ADMIN', 'MANAGER', 'AGENT', 'FINANCE']);

  return prisma.offer.findMany({
    where: { agencyId: agency.id },
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
          group: {
            select: {
              id: true,
              currentSize: true,
            },
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              username: true,
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
  const isAgencyOwner = offer.agency.ownerId === userId;
  const agencyMember = !isAgencyOwner
    ? await prisma.agencyMember.findUnique({
        where: {
          agencyId_userId: {
            agencyId: offer.agencyId,
            userId,
          },
        },
        select: { role: true, isActive: true },
      })
    : null;
  const isAgency =
    isAgencyOwner ||
    Boolean(
      agencyMember &&
        agencyMember.isActive &&
        (agencyMember.role === 'ADMIN' || agencyMember.role === 'MANAGER'),
    );
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

  const recipientUserId = isCreator ? offer.agency.ownerId : offer.plan.creatorId;
  const senderLabel = senderType === 'agency' ? 'Agency' : 'Creator';
  const counterPrice = data.price
    ? `₹${data.price.toLocaleString('en-IN')}/person`
    : 'updated terms';
  await postOfferUpdateToDirectChat(
    userId,
    recipientUserId,
    `${senderLabel} countered "${offer.plan.title}" at ${counterPrice}.`,
  );

  return negotiation;
}

export async function accept(offerId: string, userId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { plan: true },
  });

  if (!offer) throw new NotFoundError('Offer');
  if (offer.plan.creatorId !== userId) throw new ForbiddenError('Only the plan creator can accept');
  if (offer.status !== 'PENDING' && offer.status !== 'COUNTERED') {
    throw new BadRequestError('Offer cannot be accepted in current state');
  }

  const result = await acceptOfferForPlan(offer.planId, offerId, userId);

  const group = await prisma.group.findUnique({
    where: { planId: offer.planId },
    select: { id: true },
  });

  if (group) {
    await createSystemMessage(
      group.id,
      'An agency offer was accepted. Payment collection is now open for approved travelers.',
      { planId: offer.planId, offerId, action: 'payment_window_opened' },
    );

    const windowEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await scheduleConfirmingWindow(group.id, windowEnd);

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

  const acceptedAgency = await prisma.agency.findUnique({
    where: { id: offer.agencyId },
    select: { ownerId: true },
  });
  if (acceptedAgency) {
    await postOfferUpdateToDirectChat(
      userId,
      acceptedAgency.ownerId,
      `Offer accepted for "${offer.plan.title}". Payment collection is now open.`,
    );
  }

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

  const rejectedAgency = await prisma.agency.findUnique({
    where: { id: offer.agencyId },
    select: { ownerId: true },
  });
  if (rejectedAgency) {
    await postOfferUpdateToDirectChat(
      userId,
      rejectedAgency.ownerId,
      `Offer declined for "${offer.plan.title}".`,
    );
  }

  return rejected;
}

export async function withdraw(offerId: string, userId: string) {
  const offer = await prisma.offer.findUnique({
    where: { id: offerId },
    include: { agency: true, plan: true },
  });

  if (!offer) throw new NotFoundError('Offer');
  const isAgencyOwner = offer.agency.ownerId === userId;
  if (!isAgencyOwner) {
    const member = await prisma.agencyMember.findUnique({
      where: {
        agencyId_userId: {
          agencyId: offer.agencyId,
          userId,
        },
      },
      select: { role: true, isActive: true },
    });
    if (!member || !member.isActive || (member.role !== 'ADMIN' && member.role !== 'MANAGER')) {
      throw new ForbiddenError('Only agency admins/managers can withdraw');
    }
  }
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

  await postOfferUpdateToDirectChat(
    userId,
    offer.plan.creatorId,
    `We withdrew our offer for "${offer.plan.title}".`,
  );

  return withdrawn;
}
