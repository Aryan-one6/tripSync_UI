import { z } from 'zod';

const ItineraryItemSchema = z.object({
  day: z.number().int().min(0),
  title: z.string().min(1),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  meals: z.array(z.string()).optional(),
  accommodation: z.string().optional(),
  transport: z.string().optional(),
});

const BasePlanSchema = z.object({
  title: z.string().min(3).max(150),
  destination: z.string().min(2).max(100),
  destinationState: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isDateFlexible: z.boolean().default(false),
  budgetMin: z.number().int().min(0).optional(),
  budgetMax: z.number().int().min(0).optional(),
  groupSizeMin: z.number().int().min(2).max(50).default(4),
  groupSizeMax: z.number().int().min(2).max(50).default(15),
  vibes: z.array(z.string()).optional(),
  accommodation: z.enum(['hostel', 'budget', 'premium', 'camping']).optional(),
  groupType: z.enum(['friends', 'couples', 'solo', 'family', 'female_only']).optional(),
  genderPref: z.enum(['open', 'female_only', 'balanced']).optional(),
  ageRangeMin: z.number().int().min(18).max(80).optional(),
  ageRangeMax: z.number().int().min(18).max(80).optional(),
  activities: z.array(z.string()).optional(),
  description: z.string().max(2000).optional(),
  itinerary: z.array(ItineraryItemSchema).optional(),
  galleryUrls: z.array(z.string().url()).max(8).optional(),
  coverImageUrl: z.string().url().optional(),
  autoApprove: z.boolean().default(true),
});

function validatePlanRanges(
  data: {
    startDate?: string;
    endDate?: string;
    budgetMin?: number;
    budgetMax?: number;
    groupSizeMin?: number;
    groupSizeMax?: number;
    ageRangeMin?: number;
    ageRangeMax?: number;
  },
  ctx: z.RefinementCtx,
): void {
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

  if (
    data.groupSizeMin !== undefined &&
    data.groupSizeMax !== undefined &&
    data.groupSizeMin > data.groupSizeMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum group size cannot exceed maximum group size',
      path: ['groupSizeMin'],
    });
  }

  if (
    data.ageRangeMin !== undefined &&
    data.ageRangeMax !== undefined &&
    data.ageRangeMin > data.ageRangeMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Minimum age cannot exceed maximum age',
      path: ['ageRangeMin'],
    });
  }
}

export const CreatePlanSchema = BasePlanSchema.superRefine(validatePlanRanges);

export const UpdatePlanSchema = BasePlanSchema.partial().superRefine(validatePlanRanges);

export const ReferToAgenciesSchema = z.object({
  agencyIds: z.array(z.string().uuid()).min(1).max(10),
});

export const ConfirmPlanSchema = z.object({
  offerId: z.string().uuid(),
});

export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;
export type UpdatePlanInput = z.infer<typeof UpdatePlanSchema>;
export type ConfirmPlanInput = z.infer<typeof ConfirmPlanSchema>;
