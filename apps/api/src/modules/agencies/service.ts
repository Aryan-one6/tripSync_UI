import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../lib/errors.js';
import type {
  RegisterAgencyInput,
  SubmitAgencyVerificationInput,
  UpdateAgencyInput,
} from '@tripsync/shared';
import slugifyModule from 'slugify';
import { queueNotification } from '../../lib/queue.js';
import { env } from '../../lib/env.js';
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

  return prisma.agency.create({
    data: {
      ownerId: userId,
      name: data.name,
      slug,
      description: data.description,
      logoUrl: data.logoUrl,
      gstin: data.gstin,
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
  if (agency.ownerId !== userId) throw new ForbiddenError('Not your agency');

  return prisma.agency.update({
    where: { id: agencyId },
    data,
  });
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

  const verification = resolveAgencyVerificationStatus({
    hasGstin: Boolean(data.gstin || agency.gstin),
    hasPan: Boolean(data.pan || agency.pan),
    hasTourismLicense: Boolean(data.tourismLicense || agency.tourismLicense),
    ownerVerified: owner.verification !== 'BASIC',
  });

  const updated = await prisma.agency.update({
    where: { id: agencyId },
    data: {
      gstin: data.gstin ?? undefined,
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
        ? 'Your agency is now marked as verified on TripSync.'
        : 'Your agency documents were received and the onboarding status has been updated.',
    userIds: [userId],
    phoneNumbers: [owner.phone],
    ctaUrl: `${env.FRONTEND_URL}/agency/settings`,
    metadata: { agencyId: updated.id, verification: updated.verification },
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
