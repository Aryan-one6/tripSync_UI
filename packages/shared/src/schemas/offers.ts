import { z } from 'zod';

const PricingTierSchema = z.object({
  minPax: z.number().int().min(1),
  price: z.number().int().min(0),
});

const ItineraryItemSchema = z.object({
  day: z.number().int().min(0),
  title: z.string().min(1),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  meals: z.array(z.string()).optional(),
  accommodation: z.string().optional(),
  transport: z.string().optional(),
});

const InclusionsSchema = z.object({
  transport: z.boolean().optional(),
  hotel: z.boolean().optional(),
  accommodation: z.boolean().optional(),
  meals: z.union([z.string(), z.boolean()]).optional(),
  guide: z.boolean().optional(),
  visa: z.boolean().optional(),
  insurance: z.boolean().optional(),
  activities: z.array(z.string()).optional(),
});

const CancellationRuleItemSchema = z.object({
  daysBeforeTrip: z.number().int().min(0),
  refundPercent: z.number().int().min(0).max(100),
});

export const CancellationRulesSchema = z.object({
  rules: z.array(CancellationRuleItemSchema).min(1),
  convenienceFeeRefundable: z.boolean().default(false),
  agencyCancelFullRefund: z.boolean().default(true),
});

export const CreateOfferSchema = z.object({
  planId: z.string().uuid(),
  pricePerPerson: z.number().int().min(0),
  pricingTiers: z.array(PricingTierSchema).optional(),
  inclusions: InclusionsSchema.optional(),
  itinerary: z.array(ItineraryItemSchema).optional(),
  cancellationPolicy: z.string().max(2000).optional(),
  cancellationRules: CancellationRulesSchema.optional(),
  validUntil: z.string().datetime().optional(),
});

// Used by POST /groups/:id/offers — planId is resolved server-side from the group
export const SubmitOfferViaGroupSchema = z.object({
  pricePerPerson: z.number().int().min(0),
  pricingTiers: z.array(PricingTierSchema).optional(),
  inclusions: InclusionsSchema.optional(),
  itinerary: z.array(ItineraryItemSchema).optional(),
  cancellationPolicy: z.string().max(2000).optional(),
  cancellationRules: CancellationRulesSchema.optional(),
  validUntil: z.string().datetime().optional(),
  message: z.string().max(1000).optional(),
});

export const CounterOfferSchema = z.object({
  price: z.number().int().min(0).optional(),
  inclusionsDelta: z.record(z.unknown()).optional(),
  message: z.string().max(1000).optional(),
}).refine(
  (data) =>
    data.price !== undefined ||
    data.inclusionsDelta !== undefined ||
    data.message !== undefined,
  {
    message: 'Counter-offer must include at least one change',
  },
);

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type SubmitOfferViaGroupInput = z.infer<typeof SubmitOfferViaGroupSchema>;
export type CounterOfferInput = z.infer<typeof CounterOfferSchema>;
