import { z } from 'zod';

export const ListMessagesQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});

export const SendChatMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export const CreateDirectConversationSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const SendDirectMessageSchema = SendChatMessageSchema;

export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;
export type SendChatMessageInput = z.infer<typeof SendChatMessageSchema>;
export type CreateDirectConversationInput = z.infer<typeof CreateDirectConversationSchema>;
export type SendDirectMessageInput = z.infer<typeof SendDirectMessageSchema>;
