import { z } from 'zod';

export const CreateReviewSchema = z
  .object({
    groupId: z.string().uuid(),
    reviewType: z.enum(['agency', 'co_traveler']),
    targetAgencyId: z.string().uuid().optional(),
    targetUserId: z.string().uuid().optional(),
    overallRating: z.number().int().min(1).max(5),
    safetyRating: z.number().int().min(1).max(5),
    valueRating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reviewType === 'agency') {
      if (!data.targetAgencyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Agency review must include targetAgencyId',
          path: ['targetAgencyId'],
        });
      }
      if (data.targetUserId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Agency review cannot include targetUserId',
          path: ['targetUserId'],
        });
      }
    }

    if (data.reviewType === 'co_traveler') {
      if (!data.targetUserId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Co-traveler review must include targetUserId',
          path: ['targetUserId'],
        });
      }
      if (data.targetAgencyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Co-traveler review cannot include targetAgencyId',
          path: ['targetAgencyId'],
        });
      }
    }
  });

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
