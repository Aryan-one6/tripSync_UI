import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate, validateQuery } from '../../middleware/validate.js';
import { asyncHandler } from '../../middleware/async-handler.js';
import type { z } from 'zod';
import {
  CreateDirectConversationSchema,
  CreatePollSchema,
  ListMessagesQuerySchema,
  SendChatMessageSchema,
  SendDirectMessageSchema,
  VotePollSchema,
} from '@tripsync/shared';
import { param } from '../../lib/helpers.js';
import * as chatService from './service.js';

export const chatRouter = Router();

chatRouter.get('/health', (_req, res) => {
  res.json({ module: 'chat', status: 'ok' });
});

chatRouter.get(
  '/groups/:groupId/messages',
  authenticate,
  validateQuery(ListMessagesQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as z.infer<typeof ListMessagesQuerySchema>;
    const result = await chatService.listMessages(
      param(req.params.groupId),
      req.userId!,
      query.cursor,
      query.limit,
    );
    res.json({ data: result.messages, meta: { cursor: result.cursor } });
  }),
);

chatRouter.post(
  '/groups/:groupId/messages',
  authenticate,
  validate(SendChatMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await chatService.sendMessage(param(req.params.groupId), req.userId!, req.body);
    res.status(201).json({ data: message });
  }),
);

chatRouter.post(
  '/direct/conversations',
  authenticate,
  validate(CreateDirectConversationSchema),
  asyncHandler(async (req, res) => {
    const conversation = await chatService.createDirectConversation(req.userId!, req.body);
    res.status(201).json({ data: conversation });
  }),
);

chatRouter.get(
  '/direct/conversations',
  authenticate,
  asyncHandler(async (req, res) => {
    const conversations = await chatService.listDirectConversations(req.userId!);
    res.json({ data: conversations });
  }),
);

chatRouter.get(
  '/direct/conversations/:conversationId/messages',
  authenticate,
  validateQuery(ListMessagesQuerySchema),
  asyncHandler(async (req, res) => {
    const query = req.validatedQuery as z.infer<typeof ListMessagesQuerySchema>;
    const result = await chatService.listDirectMessages(
      param(req.params.conversationId),
      req.userId!,
      query.cursor,
      query.limit,
    );
    res.json({ data: result.messages, meta: { cursor: result.cursor } });
  }),
);

chatRouter.post(
  '/direct/conversations/:conversationId/messages',
  authenticate,
  validate(SendDirectMessageSchema),
  asyncHandler(async (req, res) => {
    const message = await chatService.sendDirectMessage(
      param(req.params.conversationId),
      req.userId!,
      req.body,
    );
    res.status(201).json({ data: message });
  }),
);

chatRouter.post(
  '/direct/conversations/:conversationId/read',
  authenticate,
  asyncHandler(async (req, res) => {
    await chatService.markDirectConversationRead(param(req.params.conversationId), req.userId!);
    res.json({ data: { success: true } });
  }),
);

chatRouter.post(
  '/groups/:groupId/polls',
  authenticate,
  validate(CreatePollSchema),
  asyncHandler(async (req, res) => {
    const message = await chatService.createPoll(param(req.params.groupId), req.userId!, req.body);
    res.status(201).json({ data: message });
  }),
);

chatRouter.post(
  '/messages/:id/vote',
  authenticate,
  validate(VotePollSchema),
  asyncHandler(async (req, res) => {
    const message = await chatService.voteOnPoll(param(req.params.id), req.userId!, req.body);
    res.json({ data: message });
  }),
);
