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

export async function create(userId: string, data: CreatePackageInput) {
  const agency = await prisma.agency.findUnique({ where: { ownerId: userId } });
  if (!agency) throw new ForbiddenError('You must be an agency owner');

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
  const agency = await prisma.agency.findUnique({ where: { ownerId: userId } });
  if (!agency) throw new ForbiddenError('Agency access required');

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
    },
  });
}

export async function publish(packageId: string, userId: string) {
  const agency = await prisma.agency.findUnique({ where: { ownerId: userId } });
  if (!agency) throw new ForbiddenError('Agency access required');

  const pkg = await prisma.package.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('Package');
  if (pkg.agencyId !== agency.id) throw new ForbiddenError('Not your package');
  if (pkg.status !== PlanStatus.DRAFT) {
    throw new BadRequestError('Can only publish DRAFT packages');
  }

  return prisma.package.update({
    where: { id: packageId },
    data: { status: PlanStatus.OPEN },
  });
}

export async function listAgencyPackages(userId: string) {
  const agency = await prisma.agency.findUnique({ where: { ownerId: userId } });
  if (!agency) throw new ForbiddenError('Agency access required');

  return prisma.package.findMany({
    where: { agencyId: agency.id },
    orderBy: { createdAt: 'desc' },
    include: { group: { select: { currentSize: true } } },
  });
}
