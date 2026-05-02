import { z } from 'zod';

const DiscoverQueryBaseSchema = z.object({
  audience: z.enum(['traveler', 'agency']).default('traveler'),
  destination: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  budgetMin: z.coerce.number().int().min(0).optional(),
  budgetMax: z.coerce.number().int().min(0).optional(),
  vibes: z.string().optional(), // comma-separated
  originType: z.enum(['plan', 'package']).optional(),
  planType: z.enum(['STANDARD', 'CORPORATE']).optional(),
  groupType: z.enum(['friends', 'couples', 'solo', 'family', 'female_only']).optional(),
  sort: z.enum(['recent', 'price_low', 'price_high', 'popular']).default('recent'),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

function validateDiscoverRanges(
  data: {
    startDate?: string;
    endDate?: string;
    budgetMin?: number;
    budgetMax?: number;
  },
  ctx: z.RefinementCtx,
) {
  if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Start date must be before or equal to end date',
      path: ['startDate'],
    });
  }

  if (
    data.budgetMin !== undefined &&
    data.budgetMax !== undefined &&
    data.budgetMin > data.budgetMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum budget cannot exceed maximum budget',
      path: ['budgetMin'],
    });
  }
}

export const DiscoverQuerySchema = DiscoverQueryBaseSchema.superRefine(validateDiscoverRanges);

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const FollowingDiscoverQuerySchema = DiscoverQueryBaseSchema.extend({
  q: z.string().max(200).optional(),
}).superRefine(validateDiscoverRanges);

export type DiscoverQuery = z.infer<typeof DiscoverQuerySchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type FollowingDiscoverQuery = z.infer<typeof FollowingDiscoverQuerySchema>;
