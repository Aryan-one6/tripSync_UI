import { PlanStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors.js';
import type { CreatePackageInput, UpdatePackageInput } from '@tripsync/shared';
import slugifyModule from 'slugify';
const slugify = (slugifyModule as any).default ?? slugifyModule;

function generateSlug(title: string): string {
  const base = slugify(title, { lower: true, strict: true }) as string;
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

async function resolveAgencyActor(
  userId: string,
  allowedRoles: Array<'ADMIN' | 'MANAGER' | 'AGENT' | 'FINANCE'>,
) {
  const owned = await prisma.agency.findUnique({
    where: { ownerId: userId },
  });
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

export async function create(userId: string, data: CreatePackageInput) {
  const agency = await resolveAgencyActor(userId, ['ADMIN', 'MANAGER', 'AGENT']);

  const slug = generateSlug(data.title);

  const pkg = await prisma.package.create({
    data: {
      agencyId: agency.id,
      slug,
      title: data.title,
      destination: data.destination,
      destinationState: data.destinationState,
      itinerary: data.itinerary as any,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      departureDates: data.departureDates as any,
      basePrice: data.basePrice,
      pricingTiers: data.pricingTiers as any,
      groupSizeMin: data.groupSizeMin,
      groupSizeMax: data.groupSizeMax,
      inclusions: data.inclusions as any,
      exclusions: data.exclusions,
      accommodation: data.accommodation,
      vibes: data.vibes,
      activities: data.activities,
      galleryUrls: data.galleryUrls,
      cancellationPolicy: data.cancellationPolicy,
      cancellationRules: data.cancellationRules as any,
      status: PlanStatus.DRAFT,
    },
  });

  // Create group for the package
  await prisma.group.create({
    data: { packageId: pkg.id },
  });

  return pkg;
}

export async function getById(id: string) {
  const pkg = await prisma.package.findUnique({
    where: { id },
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

  if (!pkg) throw new NotFoundError('Package');
  return pkg;
}

export async function getBySlug(slug: string) {
  const pkg = await prisma.package.findUnique({
    where: { slug },
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

  if (!pkg) throw new NotFoundError('Package');
  return pkg;
}

export async function update(packageId: string, userId: string, data: UpdatePackageInput) {
  const agency = await resolveAgencyActor(userId, ['ADMIN', 'MANAGER', 'AGENT']);

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('Package');
  if (pkg.agencyId !== agency.id) throw new ForbiddenError('Not your package');
  if (pkg.status !== PlanStatus.DRAFT) {
    throw new BadRequestError('Can only edit packages in DRAFT status');
  }

  return prisma.package.update({
    where: { id: packageId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      itinerary: data.itinerary as any,
      departureDates: data.departureDates as any,
      pricingTiers: data.pricingTiers as any,
      inclusions: data.inclusions as any,
      cancellationRules: data.cancellationRules as any,
    },
  });
}

export async function publish(packageId: string, userId: string) {
  const agency = await resolveAgencyActor(userId, ['ADMIN', 'MANAGER', 'AGENT']);

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('Package');
  if (pkg.agencyId !== agency.id) throw new ForbiddenError('Not your package');
  if (pkg.status !== PlanStatus.DRAFT) {
    throw new BadRequestError('Can only publish DRAFT packages');
  }
  const gallery = Array.isArray(pkg.galleryUrls) ? pkg.galleryUrls : [];
  const hasRequiredImage = gallery.some((value) => typeof value === 'string' && value.length > 0);
  if (!hasRequiredImage) {
    throw new BadRequestError('Add at least one package image before publishing');
  }

  return prisma.package.update({
    where: { id: packageId },
    data: { status: PlanStatus.OPEN },
  });
}

export async function listAgencyPackages(userId: string) {
  const agency = await resolveAgencyActor(userId, ['ADMIN', 'MANAGER', 'AGENT', 'FINANCE']);

  return prisma.package.findMany({
    where: { agencyId: agency.id },
    orderBy: { createdAt: 'desc' },
    include: { group: { select: { currentSize: true } } },
  });
}
