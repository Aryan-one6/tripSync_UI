import sanitizeHtml from 'sanitize-html';
import type { CreatePollInput, SendChatMessageInput, VotePollInput } from '@tripsync/shared';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { emitGroupEvent } from '../../lib/socket.js';
import { queueNotification } from '../../lib/queue.js';
import { env } from '../../lib/env.js';

const CHAT_MEMBER_STATUSES = ['APPROVED', 'COMMITTED'] as const;

type PollMetadata = {
  options: Array<{
    id: string;
    label: string;
    votes: string[];
  }>;
};

async function assertChatAccess(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  if (!membership || !CHAT_MEMBER_STATUSES.includes(membership.status as (typeof CHAT_MEMBER_STATUSES)[number])) {
    throw new ForbiddenError('Only approved travelers can access group chat');
  }

  return membership;
}

function normalizeContent(content: string) {
  return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} }).trim();
}

async function getNotificationRecipients(groupId: string, excludeUserId?: string) {
  const members = await prisma.groupMember.findMany({
    where: {
      groupId,
      status: { in: ['APPROVED', 'COMMITTED'] },
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true },
  });

  return members.map((member) => member.userId);
}

export async function listMessages(groupId: string, userId: string, cursor?: string, limit = 30) {
  await assertChatAccess(groupId, userId);

  const messages = await prisma.chatMessage.findMany({
    where: { groupId },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const ordered = [...messages].reverse();

  return {
    messages: ordered,
    cursor: messages.length === limit ? messages[messages.length - 1]?.id ?? null : null,
  };
}

export async function sendMessage(groupId: string, userId: string, data: SendChatMessageInput) {
  const membership = await assertChatAccess(groupId, userId);
  const content = normalizeContent(data.content);

  if (!content) {
    throw new BadRequestError('Message cannot be empty');
  }

  const message = await prisma.chatMessage.create({
    data: {
      groupId,
      senderId: userId,
      messageType: 'text',
      content,
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  emitGroupEvent(groupId, 'chat:message_created', message);

  const recipients = await getNotificationRecipients(groupId, userId);
  if (recipients.length > 0) {
    await queueNotification({
      type: 'chat_message',
      title: `${membership.user.fullName} posted in your trip chat`,
      body: content.slice(0, 160),
      userIds: recipients,
      ctaUrl: `${env.FRONTEND_URL}/dashboard/groups/${groupId}/chat`,
      metadata: { groupId, messageId: message.id },
    });
  }

  return message;
}

export async function createPoll(groupId: string, userId: string, data: CreatePollInput) {
  const membership = await assertChatAccess(groupId, userId);

  const metadata: PollMetadata = {
    options: data.options.map((label, index) => ({
      id: `option_${index + 1}`,
      label: normalizeContent(label),
      votes: [],
    })),
  };

  const message = await prisma.chatMessage.create({
    data: {
      groupId,
      senderId: userId,
      messageType: 'poll',
      content: normalizeContent(data.question),
      metadata: metadata as any,
    },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  emitGroupEvent(groupId, 'chat:message_created', message);

  const recipients = await getNotificationRecipients(groupId, userId);
  if (recipients.length > 0) {
    await queueNotification({
      type: 'chat_poll',
      title: `${membership.user.fullName} started a trip poll`,
      body: message.content.slice(0, 160),
      userIds: recipients,
      ctaUrl: `${env.FRONTEND_URL}/dashboard/groups/${groupId}/chat`,
      metadata: { groupId, messageId: message.id },
    });
  }

  return message;
}

export async function voteOnPoll(messageId: string, userId: string, data: VotePollInput) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!message) throw new NotFoundError('Chat message');
  await assertChatAccess(message.groupId, userId);

  if (message.messageType !== 'poll') {
    throw new BadRequestError('Only poll messages can be voted on');
  }

  const metadata = (message.metadata ?? { options: [] }) as PollMetadata;
  const options = Array.isArray(metadata.options) ? metadata.options : [];
  const option = options.find((item) => item.id === data.optionId);

  if (!option) {
    throw new BadRequestError('Selected poll option does not exist');
  }

  const nextOptions = options.map((item) => {
    const votes = item.votes.filter((vote) => vote !== userId);
    if (item.id === data.optionId) {
      votes.push(userId);
    }

    return { ...item, votes };
  });

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { metadata: { options: nextOptions } as any },
    include: {
      sender: {
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
        },
      },
    },
  });

  emitGroupEvent(updated.groupId, 'chat:message_updated', updated);
  return updated;
}

export async function createSystemMessage(
  groupId: string,
  content: string,
  metadata?: Record<string, unknown>,
) {
  const message = await prisma.chatMessage.create({
    data: {
      groupId,
      senderId: null,
      messageType: 'system',
      content: normalizeContent(content),
      metadata: metadata as any,
    },
  });

  emitGroupEvent(groupId, 'chat:message_created', message);
  return message;
}
