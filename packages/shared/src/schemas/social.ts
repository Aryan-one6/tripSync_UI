import { z } from 'zod';

export const SocialFeedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SocialFeedQuery = z.infer<typeof SocialFeedQuerySchema>;
