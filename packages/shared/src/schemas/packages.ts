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

const PricingTierSchema = z.object({
  minPax: z.number().int().min(1),
  price: z.number().int().min(0),
});

const InclusionsSchema = z.object({
  transport: z.boolean().optional(),
  meals: z.string().optional(), // e.g. "breakfast,lunch,dinner"
  activities: z.array(z.string()).optional(),
  accommodation: z.boolean().optional(),
});

const CancellationRuleItemSchema = z.object({
  daysBeforeTrip: z.number().int().min(0),
  refundPercent: z.number().int().min(0).max(100),
});

const CancellationRulesSchema = z.object({
  rules: z.array(CancellationRuleItemSchema).min(1),
  convenienceFeeRefundable: z.boolean().default(false),
  agencyCancelFullRefund: z.boolean().default(true),
});

const BasePackageSchema = z.object({
  title: z.string().min(3).max(150),
  destination: z.string().min(2).max(100),
  destinationState: z.string().max(100).optional(),
  itinerary: z.array(ItineraryItemSchema).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  departureDates: z.array(z.string().datetime()).optional(),
  basePrice: z.number().int().min(0),
  pricingTiers: z.array(PricingTierSchema).optional(),
  groupSizeMin: z.number().int().min(2).max(100).default(4),
  groupSizeMax: z.number().int().min(2).max(100).default(20),
  inclusions: InclusionsSchema.optional(),
  exclusions: z.string().max(2000).optional(),
  accommodation: z.string().max(100).optional(),
  vibes: z.array(z.string()).optional(),
  activities: z.array(z.string()).optional(),
  galleryUrls: z
    .array(z.string().url())
    .min(1, 'At least one package image is required')
    .max(8),
  cancellationPolicy: z.string().max(2000).optional(),
  cancellationRules: CancellationRulesSchema.optional(),
});

function validatePackageRanges(
  data: {
    startDate?: string;
    endDate?: string;
    groupSizeMin?: number;
    groupSizeMax?: number;
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
}

export const CreatePackageSchema = BasePackageSchema.superRefine(validatePackageRanges);

export const UpdatePackageSchema = BasePackageSchema.partial().superRefine(validatePackageRanges);

export type CreatePackageInput = z.infer<typeof CreatePackageSchema>;
export type UpdatePackageInput = z.infer<typeof UpdatePackageSchema>;
