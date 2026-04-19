import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from '../../lib/errors.js';
import type {
  InviteAgencyMemberInput,
  RegisterAgencyInput,
  SubmitAgencyVerificationInput,
  UpdateAgencyMemberInput,
  UpdateAgencyInput,
} from '@tripsync/shared';
import slugifyModule from 'slugify';
import { queueNotification } from '../../lib/queue.js';
import { env } from '../../lib/env.js';
import { isValidGSTIN, assertGstinUnique, verifyGstinFromApi } from '../../lib/gst.js';
const slugify = (slugifyModule as any).default ?? slugifyModule;

function generateSlug(name: string): string {
  const base = slugify(name, { lower: true, strict: true }) as string;
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export async function register(userId: string, data: RegisterAgencyInput) {
  // Check if user already owns an agency
  const existing = await prisma.agency.findUnique({ where: { ownerId: userId } });
  if (existing) throw new ConflictError('You already have a registered agency');

  const slug = generateSlug(data.name);

  // ─── GST Verification ─────────────────────────────────────────────────
  let gstVerifiedName: string | null = null;
  let gstVerifiedAt: Date | null = null;
  const normalizedGstin = data.gstin?.toUpperCase().trim() || null;

  if (normalizedGstin) {
    // Validate format
    if (!isValidGSTIN(normalizedGstin)) {
      throw new BadRequestError(
        `Invalid GSTIN format: ${normalizedGstin}. Expected 15-character Indian GSTIN (e.g. 27AADCB2230M1ZT).`,
      );
    }

    // Check uniqueness — throws ConflictError if already registered
    await assertGstinUnique(normalizedGstin);

    // Verify via public GST API to fetch company name
    const gstResult = await verifyGstinFromApi(normalizedGstin);
    if (gstResult.verified) {
      gstVerifiedName = gstResult.tradeName || gstResult.legalName;
      gstVerifiedAt = new Date();
    }

    if (gstResult.status === 'Cancelled' || gstResult.status === 'Suspended') {
      throw new BadRequestError(
        `GSTIN ${normalizedGstin} has status "${gstResult.status}". Only active GSTINs are accepted.`,
      );
    }
  }

  return prisma.agency.create({
    data: {
      ownerId: userId,
      name: data.name,
      slug,
      description: data.description,
      logoUrl: data.logoUrl,
      gstin: normalizedGstin,
      gstVerifiedName,
      gstVerifiedAt,
      pan: data.pan,
      tourismLicense: data.tourismLicense,
      address: data.address,
      city: data.city,
      state: data.state,
      phone: data.phone,
      email: data.email,
      specializations: data.specializations,
      destinations: data.destinations,
    },
  });
}

function resolveAgencyVerificationStatus(input: {
  hasGstin: boolean;
  hasPan: boolean;
  hasTourismLicense: boolean;
  ownerVerified: boolean;
}) {
  if (
    input.hasGstin &&
    input.hasPan &&
    input.hasTourismLicense &&
    input.ownerVerified
  ) {
    return 'verified';
  }

  if (input.hasPan || input.hasGstin || input.hasTourismLicense) {
    return 'under_review';
  }

  return 'pending';
}

export async function getBySlug(slug: string) {
  const agency = await prisma.agency.findUnique({
    where: { slug },
    include: {
      packages: {
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      reviewsReceived: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          reviewer: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!agency) throw new NotFoundError('Agency');
  return agency;
}

export async function update(agencyId: string, userId: string, data: UpdateAgencyInput) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw new NotFoundError('Agency');

  await assertAgencyPermission(agency.id, userId, ['ADMIN', 'MANAGER']);

  return prisma.agency.update({
    where: { id: agencyId },
    data,
  });
}

async function assertAgencyPermission(
  agencyId: string,
  userId: string,
  roles: Array<'ADMIN' | 'MANAGER' | 'AGENT' | 'FINANCE'>,
) {
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { ownerId: true },
  });
  if (!agency) throw new NotFoundError('Agency');
  if (agency.ownerId === userId) return;

  const member = await prisma.agencyMember.findUnique({
    where: { agencyId_userId: { agencyId, userId } },
    select: { role: true, isActive: true },
  });

  if (!member || !member.isActive || !roles.includes(member.role as (typeof roles)[number])) {
    throw new ForbiddenError('Insufficient agency permissions');
  }
}

export async function listMembers(agencyId: string, userId: string) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER', 'FINANCE', 'AGENT']);

  return prisma.agencyMember.findMany({
    where: { agencyId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          city: true,
          verification: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  });
}

export async function inviteMember(agencyId: string, userId: string, data: InviteAgencyMemberInput) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER']);

  const targetUser = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true },
  });
  if (!targetUser) throw new NotFoundError('User');

  return prisma.agencyMember.upsert({
    where: { agencyId_userId: { agencyId, userId: data.userId } },
    update: {
      role: data.role,
      isActive: true,
      invitedBy: userId,
      joinedAt: new Date(),
    },
    create: {
      agencyId,
      userId: data.userId,
      role: data.role,
      invitedBy: userId,
      isActive: true,
    },
  });
}

export async function updateMember(
  agencyId: string,
  userId: string,
  memberUserId: string,
  data: UpdateAgencyMemberInput,
) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER']);

  const member = await prisma.agencyMember.findUnique({
    where: { agencyId_userId: { agencyId, userId: memberUserId } },
  });
  if (!member) throw new NotFoundError('Agency member');

  return prisma.agencyMember.update({
    where: { agencyId_userId: { agencyId, userId: memberUserId } },
    data: {
      role: data.role ?? undefined,
      isActive: data.isActive ?? undefined,
    },
  });
}

export async function removeMember(agencyId: string, userId: string, memberUserId: string) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER']);

  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: { ownerId: true },
  });
  if (!agency) throw new NotFoundError('Agency');
  if (agency.ownerId === memberUserId) {
    throw new BadRequestError('Cannot remove agency owner');
  }

  await prisma.agencyMember.delete({
    where: { agencyId_userId: { agencyId, userId: memberUserId } },
  });

  return { success: true };
}

export async function getAgencyAnalytics(agencyId: string, userId: string) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER', 'FINANCE', 'AGENT']);

  const [offers, packages, wallet, disputes] = await Promise.all([
    prisma.offer.findMany({
      where: { agencyId },
      select: { status: true, pricePerPerson: true, createdAt: true },
    }),
    prisma.package.findMany({
      where: { agencyId },
      select: { status: true, basePrice: true, createdAt: true },
    }),
    prisma.agencyWallet.findUnique({ where: { agencyId } }),
    prisma.dispute.count({ where: { agencyId, status: { in: ['OPEN', 'EVIDENCE_REQUIRED'] } } }),
  ]);

  const acceptedOffers = offers.filter((offer) => offer.status === 'ACCEPTED').length;
  const totalOffers = offers.length;
  const conversionRate = totalOffers === 0 ? 0 : Number(((acceptedOffers / totalOffers) * 100).toFixed(2));

  return {
    totals: {
      offers: totalOffers,
      acceptedOffers,
      conversionRate,
      packages: packages.length,
      openPackages: packages.filter((pkg) => pkg.status === 'OPEN').length,
      activeDisputes: disputes,
    },
    finance: {
      pendingBalance: wallet?.pendingBalance ?? 0,
      availableBalance: wallet?.availableBalance ?? 0,
      totalEarned: wallet?.totalEarned ?? 0,
      totalCommission: wallet?.totalCommission ?? 0,
      payoutMode: wallet?.payoutMode ?? 'TRUST',
    },
  };
}

export async function getAgencyBookingCalendar(agencyId: string, userId: string) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER', 'FINANCE', 'AGENT']);

  const [packageBookings, planBookings] = await Promise.all([
    prisma.group.findMany({
      where: {
        package: { agencyId },
      },
      include: {
        package: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.group.findMany({
      where: {
        plan: {
          selectedOffer: {
            agencyId,
          },
        },
      },
      include: {
        plan: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);

  const rows = [
    ...packageBookings
      .filter((booking) => booking.package)
      .map((booking) => ({
        groupId: booking.id,
        source: 'PACKAGE' as const,
        sourceId: booking.package!.id,
        title: booking.package!.title,
        startDate: booking.package!.startDate,
        endDate: booking.package!.endDate,
        status: booking.package!.status,
        memberCount: booking._count.members,
      })),
    ...planBookings
      .filter((booking) => booking.plan)
      .map((booking) => ({
        groupId: booking.id,
        source: 'PLAN_OFFER' as const,
        sourceId: booking.plan!.id,
        title: booking.plan!.title,
        startDate: booking.plan!.startDate,
        endDate: booking.plan!.endDate,
        status: booking.plan!.status,
        memberCount: booking._count.members,
      })),
  ];

  return rows.sort((a, b) => {
    const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
    const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
    return bTime - aTime;
  });
}

export async function listAgencyRiskFlags(agencyId: string, userId: string) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER', 'FINANCE']);
  return prisma.fraudRiskFlag.findMany({
    where: { agencyId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function listInsuranceQuotes(agencyId: string, userId: string) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER', 'FINANCE', 'AGENT']);
  return prisma.insuranceQuote.findMany({
    where: { agencyId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function createInsuranceQuote(
  agencyId: string,
  userId: string,
  payload: {
    groupId?: string;
    targetUserId: string;
    provider?: string;
    planCode?: string;
    premium?: number;
    coverage?: number;
    metadata?: Record<string, unknown>;
  },
) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER', 'FINANCE', 'AGENT']);
  return prisma.insuranceQuote.create({
    data: {
      agencyId,
      groupId: payload.groupId,
      userId: payload.targetUserId,
      provider: payload.provider ?? 'deferred',
      planCode: payload.planCode,
      premium: payload.premium,
      coverage: payload.coverage,
      status: 'draft',
      metadata: payload.metadata as any,
    },
  });
}

export async function listCustomers(agencyId: string, userId: string) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER', 'FINANCE', 'AGENT']);
  return prisma.agencyCustomer.findMany({
    where: { agencyId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          username: true,
          avatarUrl: true,
          city: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function upsertCustomer(
  agencyId: string,
  userId: string,
  payload: {
    customerUserId: string;
    tags?: string[];
    notes?: string;
  },
) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER', 'FINANCE', 'AGENT']);
  return prisma.agencyCustomer.upsert({
    where: {
      agencyId_userId: {
        agencyId,
        userId: payload.customerUserId,
      },
    },
    update: {
      tags: payload.tags as any,
      notes: payload.notes,
      updatedAt: new Date(),
    },
    create: {
      agencyId,
      userId: payload.customerUserId,
      tags: payload.tags as any,
      notes: payload.notes,
    },
  });
}

export async function listCampaigns(agencyId: string, userId: string) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER', 'FINANCE']);
  return prisma.agencyCampaign.findMany({
    where: { agencyId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
}

export async function createCampaign(
  agencyId: string,
  userId: string,
  payload: {
    name: string;
    description?: string;
    targetTags?: string[];
    scheduledAt?: string;
  },
) {
  await assertAgencyPermission(agencyId, userId, ['ADMIN', 'MANAGER', 'FINANCE']);
  return prisma.agencyCampaign.create({
    data: {
      agencyId,
      name: payload.name,
      description: payload.description,
      targetTags: payload.targetTags as any,
      scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
      status: 'draft',
    },
  });
}

export async function evaluateAgencyTrustProfiles(agencyId?: string) {
  const agencies = await prisma.agency.findMany({
    where: agencyId ? { id: agencyId } : undefined,
    select: {
      id: true,
      totalTrips: true,
      avgRating: true,
      createdAt: true,
    },
  });

  const now = new Date();
  const thresholdDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const results: Array<{ agencyId: string; trustScore: number; eligibleForPro: boolean }> = [];

  for (const agency of agencies) {
    const recentDisputes = await prisma.dispute.count({
      where: {
        agencyId: agency.id,
        createdAt: { gte: thresholdDate },
        status: { in: ['OPEN', 'EVIDENCE_REQUIRED', 'SPLIT_REFUND'] },
      },
    });

    const monthsActive = Math.max(
      0,
      (now.getTime() - agency.createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000),
    );
    const ratingScore = Math.round(Math.min(5, agency.avgRating) * 20);
    const tripScore = Math.min(40, agency.totalTrips * 2);
    const disputePenalty = Math.min(40, recentDisputes * 10);
    const trustScore = Math.max(0, ratingScore + tripScore - disputePenalty);
    const eligibleForPro =
      agency.totalTrips >= 10 &&
      agency.avgRating >= 4 &&
      monthsActive >= 6 &&
      recentDisputes === 0;

    await prisma.agencyTrustProfile.upsert({
      where: { agencyId: agency.id },
      update: {
        trustScore,
        eligibleForPro,
        completedTripsCount: agency.totalTrips,
        averageRatingSnapshot: agency.avgRating,
        recentDisputesCount: recentDisputes,
        lastEvaluatedAt: now,
      },
      create: {
        agencyId: agency.id,
        trustScore,
        eligibleForPro,
        completedTripsCount: agency.totalTrips,
        averageRatingSnapshot: agency.avgRating,
        recentDisputesCount: recentDisputes,
        lastEvaluatedAt: now,
      },
    });

    await prisma.agencyWallet.upsert({
      where: { agencyId: agency.id },
      update: {
        payoutMode: eligibleForPro ? 'PRO' : 'TRUST',
      },
      create: {
        agencyId: agency.id,
        payoutMode: eligibleForPro ? 'PRO' : 'TRUST',
      },
    });

    results.push({ agencyId: agency.id, trustScore, eligibleForPro });
  }

  return results;
}

export async function submitVerification(
  agencyId: string,
  userId: string,
  data: SubmitAgencyVerificationInput,
) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) throw new NotFoundError('Agency');
  if (agency.ownerId !== userId) throw new ForbiddenError('Not your agency');

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, verification: true },
  });
  if (!owner) throw new NotFoundError('User');

  // ─── GST Verification (if GSTIN is being submitted/updated) ────────────
  let gstVerifiedName = agency.gstVerifiedName;
  let gstVerifiedAt = agency.gstVerifiedAt;
  let normalizedGstin = agency.gstin;

  if (data.gstin) {
    normalizedGstin = data.gstin.toUpperCase().trim();

    // Validate format
    if (!isValidGSTIN(normalizedGstin)) {
      throw new BadRequestError(
        `Invalid GSTIN format: ${normalizedGstin}. Expected 15-character Indian GSTIN (e.g. 27AADCB2230M1ZT).`,
      );
    }

    // Check uniqueness (exclude current agency)
    await assertGstinUnique(normalizedGstin, agencyId);

    // Verify via public GST API
    const gstResult = await verifyGstinFromApi(normalizedGstin);
    if (gstResult.verified) {
      gstVerifiedName = gstResult.tradeName || gstResult.legalName;
      gstVerifiedAt = new Date();
    }

    if (gstResult.status === 'Cancelled' || gstResult.status === 'Suspended') {
      throw new BadRequestError(
        `GSTIN ${normalizedGstin} has status "${gstResult.status}". Only active GSTINs are accepted.`,
      );
    }
  }

  const verification = resolveAgencyVerificationStatus({
    hasGstin: Boolean(normalizedGstin),
    hasPan: Boolean(data.pan || agency.pan),
    hasTourismLicense: Boolean(data.tourismLicense || agency.tourismLicense),
    ownerVerified: owner.verification !== 'BASIC',
  });

  const updated = await prisma.agency.update({
    where: { id: agencyId },
    data: {
      gstin: normalizedGstin ?? undefined,
      gstVerifiedName: gstVerifiedName ?? undefined,
      gstVerifiedAt: gstVerifiedAt ?? undefined,
      pan: data.pan ?? undefined,
      tourismLicense: data.tourismLicense ?? undefined,
      address: data.address ?? undefined,
      city: data.city ?? undefined,
      state: data.state ?? undefined,
      phone: data.phone ?? undefined,
      email: data.email ?? undefined,
      description: data.description ?? undefined,
      verification,
    },
  });

  await queueNotification({
    type: 'agency_verification_updated',
    title: `${updated.name} verification ${verification.replace('_', ' ')}`,
    body:
      verification === 'verified'
        ? 'Your agency is now marked as verified on TravellersIn.'
        : 'Your agency documents were received and the onboarding status has been updated.',
    userIds: [userId],
    phoneNumbers: [owner.phone],
    ctaUrl: `${env.FRONTEND_URL}/agency/settings`,
    metadata: {
      agencyId: updated.id,
      verification: updated.verification,
      gstVerifiedName: updated.gstVerifiedName,
    },
  });

  return updated;
}

export async function browse(filters: {
  city?: string;
  state?: string;
  specialization?: string;
  destination?: string;
  cursor?: string;
  limit: number;
}) {
  const where: any = { isActive: true };

  if (filters.city) where.city = { contains: filters.city, mode: 'insensitive' };
  if (filters.state) where.state = { contains: filters.state, mode: 'insensitive' };

  // JSONB array containment for specializations and destinations
  if (filters.specialization) {
    where.specializations = { array_contains: [filters.specialization] };
  }
  if (filters.destination) {
    where.destinations = { array_contains: [filters.destination] };
  }

  const agencies = await prisma.agency.findMany({
    where,
    orderBy: { avgRating: 'desc' },
    take: filters.limit,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    select: {
      id: true, name: true, slug: true, logoUrl: true, description: true,
      city: true, state: true, specializations: true, destinations: true,
      verification: true, avgRating: true, totalReviews: true, totalTrips: true,
    },
  });

  return {
    agencies,
    cursor: agencies.length === filters.limit ? agencies[agencies.length - 1]?.id : null,
  };
}
