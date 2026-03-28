import type { Prisma, PrismaClient, VerificationTier } from '@prisma/client';
import { prisma } from './prisma.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

export function deriveVerificationTier(user: {
  aadhaarHash?: string | null;
  completedTrips?: number | null;
  avgRating?: number | null;
}): VerificationTier {
  if (!user.aadhaarHash) {
    return 'BASIC';
  }

  if ((user.completedTrips ?? 0) >= 3 && (user.avgRating ?? 0) >= 4.5) {
    return 'TRUSTED';
  }

  return 'VERIFIED';
}

export async function syncUserVerificationTier(
  userId: string,
  db: DbClient = prisma,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      aadhaarHash: true,
      completedTrips: true,
      avgRating: true,
      verification: true,
    },
  });

  if (!user) {
    return null;
  }

  const nextTier = deriveVerificationTier(user);
  if (user.verification === nextTier) {
    return user.verification;
  }

  await db.user.update({
    where: { id: userId },
    data: { verification: nextTier },
  });

  return nextTier;
}
