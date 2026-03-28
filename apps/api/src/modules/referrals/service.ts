import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors.js';

export async function referToAgencies(planId: string, userId: string, agencyIds: string[]) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new NotFoundError('Plan');
  if (plan.creatorId !== userId) throw new ForbiddenError('Only the creator can refer');
  if (plan.status !== 'OPEN') throw new BadRequestError('Plan must be OPEN to refer agencies');

  // Verify all agencies exist
  const agencies = await prisma.agency.findMany({
    where: { id: { in: agencyIds }, isActive: true },
  });

  if (agencies.length !== agencyIds.length) {
    throw new BadRequestError('One or more agencies not found');
  }

  // Create referred offers (placeholder offers marked as referred)
  const operations = agencies.map((agency) =>
    prisma.offer.upsert({
      where: { planId_agencyId: { planId, agencyId: agency.id } },
      create: {
        planId,
        agencyId: agency.id,
        pricePerPerson: 0, // agency will fill in
        isReferred: true,
        referredAt: new Date(),
        status: 'PENDING',
      },
      update: {
        isReferred: true,
        referredAt: new Date(),
      },
    }),
  );

  await prisma.$transaction(operations);

  return { referredCount: agencies.length };
}

export async function getAgencyReferrals(userId: string) {
  const agency = await prisma.agency.findUnique({ where: { ownerId: userId } });
  if (!agency) throw new ForbiddenError('Agency access required');

  return prisma.offer.findMany({
    where: {
      agencyId: agency.id,
      isReferred: true,
    },
    include: {
      plan: {
        select: {
          id: true, title: true, destination: true, startDate: true, endDate: true,
          budgetMin: true, budgetMax: true, groupSizeMin: true, groupSizeMax: true,
          vibes: true,
          creator: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { referredAt: 'desc' },
  });
}
