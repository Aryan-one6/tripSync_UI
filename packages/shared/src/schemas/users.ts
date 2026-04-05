import { z } from 'zod';

export const UserSearchQuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});

export type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;
