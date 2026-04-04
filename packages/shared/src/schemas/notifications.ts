import { z } from 'zod';

export const NotificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

export const ProfileViewListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type NotificationListQuery = z.infer<typeof NotificationListQuerySchema>;
export type ProfileViewListQuery = z.infer<typeof ProfileViewListQuerySchema>;
