import { z } from 'zod';

export const CreatePollSchema = z.object({
  question: z.string().min(3).max(500),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
});

export const VotePollSchema = z.object({
  optionId: z.string().min(1).max(100),
});

export const InviteGroupMemberSchema = z.object({
  userId: z.string().uuid(),
});

export type CreatePollInput = z.infer<typeof CreatePollSchema>;
export type VotePollInput = z.infer<typeof VotePollSchema>;
export type InviteGroupMemberInput = z.infer<typeof InviteGroupMemberSchema>;
