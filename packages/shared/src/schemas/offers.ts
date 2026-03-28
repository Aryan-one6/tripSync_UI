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
  meals: z.string().optional(),
  activities: z.array(z.string()).optional(),
  accommodation: z.boolean().optional(),
});

export const CreateOfferSchema = z.object({
  planId: z.string().uuid(),
  pricePerPerson: z.number().int().min(0),
  pricingTiers: z.array(PricingTierSchema).optional(),
  inclusions: InclusionsSchema.optional(),
  itinerary: z.array(ItineraryItemSchema).optional(),
  cancellationPolicy: z.string().max(2000).optional(),
  validUntil: z.string().datetime().optional(),
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
export type CounterOfferInput = z.infer<typeof CounterOfferSchema>;
