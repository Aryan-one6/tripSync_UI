import sanitizeHtml from 'sanitize-html';
import { PlanStatus } from '@prisma/client';
import type {
  CreateDirectConversationInput,
  CreatePollInput,
  SendChatMessageInput,
  SendDirectMessageInput,
  VotePollInput,
} from '@tripsync/shared';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { emitDirectConversationEvent, emitGroupEvent, emitUserEvent } from '../../lib/socket.js';
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

type SanitizeResult = {
  sanitized: string;
  flagged: boolean;
  originalContent?: string;
  policyTags: string[];
};

const PHONE_REGEX = /(?:\+?91[\s-]?)?[6-9]\d{9}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const UPI_REGEX = /\b[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}\b/g;
const IFSC_REGEX = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
const BYPASS_KEYWORDS = /\b(whatsapp|telegram|signal|gpay|phonepe|paytm)\b/i;

function sanitizeChatContent(content: string): SanitizeResult {
  let flagged = false;
  const tags = new Set<string>();
  let sanitized = content;

  sanitized = sanitized.replace(PHONE_REGEX, (match) => {
    flagged = true;
    tags.add('PHONE');
    const numbersOnly = match.replace(/[^\d]/g, '');
    if (numbersOnly.length < 6) return '[Contact shared via platform]';
    return `${numbersOnly.slice(0, 2)}****${numbersOnly.slice(-3)} [Contact shared via platform]`;
  });

  sanitized = sanitized.replace(EMAIL_REGEX, (match) => {
    flagged = true;
    tags.add('EMAIL');
    const [local, domain] = match.split('@');
    return `${local[0] ?? 'u'}****@${domain} [Contact shared via platform]`;
  });

  sanitized = sanitized.replace(UPI_REGEX, (match) => {
    if (match.includes('****')) return match;
    flagged = true;
    tags.add('UPI');
    const [local, domain] = match.split('@');
    return `${local[0] ?? 'u'}****@${domain} [Payment request detected]`;
  });

  sanitized = sanitized.replace(IFSC_REGEX, (match) => {
    flagged = true;
    tags.add('BANK');
    return `${match.slice(0, 4)}****${match.slice(-3)} [Bank details detected]`;
  });

  if (BYPASS_KEYWORDS.test(sanitized)) {
    flagged = true;
    tags.add('OFF_PLATFORM_COORDINATION');
    sanitized = `${sanitized} [Use platform chat for safety]`;
  }

  return {
    sanitized,
    flagged,
    originalContent: flagged ? content : undefined,
    policyTags: Array.from(tags),
  };
}

function buildSafetyWarningMessage() {
  return 'For your safety, keep payments and coordination on TravellersIn. External payments are not covered by escrow protection or refund policy.';
}

async function logContactRiskFlag(input: {
  userId: string;
  groupId?: string;
  messageId?: string;
  policyTags: string[];
}) {
  await prisma.fraudRiskFlag.create({
    data: {
      userId: input.userId,
      groupId: input.groupId,
      messageId: input.messageId,
      type: 'CONTACT_SHARING',
      severity: 'medium',
      details: {
        policyTags: input.policyTags,
      } as any,
      raisedByUserId: input.userId,
    },
  });
}

function buildDirectConversationKey(leftUserId: string, rightUserId: string) {
  return [leftUserId, rightUserId].sort().join(':');
}

async function getDirectMessagingContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    throw new NotFoundError('User');
  }

  const membership = await prisma.groupMember.findFirst({
    where: {
      userId,
      status: { in: ['INTERESTED', 'APPROVED', 'COMMITTED'] },
    },
    select: { id: true },
  });

  const createdPlan = await prisma.plan.findFirst({
    where: { creatorId: userId },
    select: { id: true },
  });

  const agency = await prisma.agency.findUnique({
    where: { ownerId: userId },
    select: { id: true },
  });

  return {
    userId,
    hasTripParticipation: Boolean(membership || createdPlan),
    ownedAgencyId: agency?.id ?? null,
  };
}

async function assertUserEligibleForDirectMessages(userId: string) {
  const context = await getDirectMessagingContext(userId);

  if (!context.hasTripParticipation && !context.ownedAgencyId) {
    throw new ForbiddenError(
      'Direct messages unlock after joining a trip or operating an agency with live offers',
    );
  }

  return context;
}

async function assertDirectConversationEligibility(leftUserId: string, rightUserId: string) {
  const [left, right] = await Promise.all([
    assertUserEligibleForDirectMessages(leftUserId),
    assertUserEligibleForDirectMessages(rightUserId),
  ]);

  const leftIsAgency = Boolean(left.ownedAgencyId);
  const rightIsAgency = Boolean(right.ownedAgencyId);

  if (leftIsAgency && rightIsAgency) {
    throw new ForbiddenError('Direct messaging between two agencies is not supported');
  }

  if (leftIsAgency || rightIsAgency) {
    const agencyOwnerId = leftIsAgency ? leftUserId : rightUserId;
    const travelerUserId = leftIsAgency ? rightUserId : leftUserId;

    const relatedOffer = await prisma.offer.findFirst({
      where: {
        plan: { creatorId: travelerUserId },
        agency: { ownerId: agencyOwnerId },
      },
      select: { id: true },
    });

    if (!relatedOffer) {
      const packageContext = await prisma.groupMember.findFirst({
        where: {
          userId: travelerUserId,
          status: { in: ['INTERESTED', 'APPROVED', 'COMMITTED'] },
          group: {
            package: {
              agency: {
                ownerId: agencyOwnerId,
              },
            },
          },
        },
        select: { id: true },
      });

      if (!packageContext) {
        throw new ForbiddenError(
          'Agency and traveler direct chat starts only after an offer exists or traveler joins an agency package',
        );
      }
    }

    return;
  }

  const sharedTrip = await prisma.groupMember.findFirst({
    where: {
      userId: leftUserId,
      status: { in: ['APPROVED', 'COMMITTED'] },
      group: {
        members: {
          some: {
            userId: rightUserId,
            status: { in: ['APPROVED', 'COMMITTED'] },
          },
        },
      },
    },
    select: { id: true },
  });

  if (!sharedTrip) {
    throw new ForbiddenError(
      'Traveler direct chat unlocks only after both users share an approved or committed trip',
    );
  }
}

async function assertDirectConversationAccess(conversationId: string, userId: string) {
  const participant = await prisma.directConversationParticipant.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  fullName: true,
                  avatarUrl: true,
                  city: true,
                  verification: true,
                  avgRating: true,
                  completedTrips: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!participant) {
    throw new ForbiddenError('You cannot access this conversation');
  }

  return participant;
}

async function assertChatAccess(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  if (
    membership &&
    CHAT_MEMBER_STATUSES.includes(membership.status as (typeof CHAT_MEMBER_STATUSES)[number])
  ) {
    return membership;
  }

  // Agency owners can access a trip room when they have an active offer on that plan.
  const agency = await prisma.agency.findUnique({
    where: { ownerId: userId },
    select: { id: true },
  });

  if (agency) {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        planId: true,
        plan: {
          select: {
            status: true,
          },
        },
        package: {
          select: {
            status: true,
            agency: {
              select: {
                ownerId: true,
              },
            },
          },
        },
      },
    });

    if (group?.planId && group.plan && [PlanStatus.CONFIRMING, PlanStatus.CONFIRMED].includes(group.plan.status as PlanStatus)) {
      const activeOffer = await prisma.offer.findFirst({
        where: {
          planId: group.planId,
          agencyId: agency.id,
          status: { in: ['ACCEPTED'] },
        },
        select: { id: true },
      });

      if (activeOffer) {
        const agencyUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, fullName: true, avatarUrl: true },
        });

        if (!agencyUser) {
          throw new NotFoundError('User');
        }

        return {
          id: `agency:${groupId}:${userId}`,
          groupId,
          userId,
          role: 'MEMBER',
          status: 'APPROVED',
          joinedAt: new Date(),
          committedAt: null,
          leftAt: null,
          user: agencyUser,
        };
      }
    }

    if (
      group?.package &&
      [PlanStatus.CONFIRMING, PlanStatus.CONFIRMED].includes(group.package.status as PlanStatus) &&
      group.package.agency.ownerId === userId
    ) {
      const agencyUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, avatarUrl: true },
      });

      if (!agencyUser) {
        throw new NotFoundError('User');
      }

      return {
        id: `agency:${groupId}:${userId}`,
        groupId,
        userId,
        role: 'MEMBER',
        status: 'APPROVED',
        joinedAt: new Date(),
        committedAt: null,
        leftAt: null,
        user: agencyUser,
      };
    }
  }

  throw new ForbiddenError('Only approved travelers or active bidding agencies can access group chat');
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

  const sanitized = sanitizeChatContent(content);

  const message = await prisma.chatMessage.create({
    data: {
      groupId,
      senderId: userId,
      messageType: 'text',
      content: sanitized.sanitized,
      metadata: sanitized.flagged
        ? ({
            flagged: true,
            policyTags: sanitized.policyTags,
            originalContent: sanitized.originalContent,
          } as any)
        : undefined,
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

  if (sanitized.flagged) {
    await createSystemMessage(groupId, buildSafetyWarningMessage(), {
      action: 'safety_warning',
      policyTags: sanitized.policyTags,
      flaggedMessageId: message.id,
    });
    await logContactRiskFlag({
      userId,
      groupId,
      messageId: message.id,
      policyTags: sanitized.policyTags,
    });
  }

  const recipients = await getNotificationRecipients(groupId, userId);
  if (recipients.length > 0) {
    await queueNotification({
      type: 'chat_message',
      title: `${membership.user.fullName} posted in your trip chat`,
      body: sanitized.sanitized.slice(0, 160),
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

export async function createDirectConversation(
  userId: string,
  data: CreateDirectConversationInput,
) {
  if (data.targetUserId === userId) {
    throw new BadRequestError('Cannot message yourself');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: data.targetUserId },
    select: { id: true },
  });

  if (!targetUser) throw new NotFoundError('User');
  const key = buildDirectConversationKey(userId, data.targetUserId);
  const existing = await prisma.directConversation.findUnique({
    where: { key },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              city: true,
              verification: true,
              avgRating: true,
              completedTrips: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              city: true,
              verification: true,
              avgRating: true,
              completedTrips: true,
            },
          },
        },
      },
    },
  });
  if (existing) {
    return serializeDirectConversation(existing, userId);
  }

  await assertDirectConversationEligibility(userId, data.targetUserId);

  const conversation = await prisma.directConversation.upsert({
    where: { key },
    create: {
      key,
      participants: {
        create: [{ userId }, { userId: data.targetUserId }],
      },
    },
    update: {},
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              city: true,
              verification: true,
              avgRating: true,
              completedTrips: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              city: true,
              verification: true,
              avgRating: true,
              completedTrips: true,
            },
          },
        },
      },
    },
  });

  return serializeDirectConversation(conversation, userId);
}

function serializeDirectConversation(
  conversation: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    participants: Array<{
      lastReadAt: Date | null;
      user: {
        id: string;
        username: string | null;
        fullName: string;
        avatarUrl: string | null;
        city: string | null;
        verification: string;
        avgRating: number;
        completedTrips: number;
      };
    }>;
    messages?: Array<{
      id: string;
      content: string;
      createdAt: Date;
      senderId?: string;
      sender?: {
        id: string;
        username: string | null;
        fullName: string;
        avatarUrl: string | null;
        city: string | null;
        verification: string;
        avgRating: number;
        completedTrips: number;
      } | null;
    }>;
  },
  viewerUserId: string,
) {
  const counterpart = conversation.participants.find((participant) => participant.user.id !== viewerUserId)?.user;
  const viewerParticipant = conversation.participants.find((participant) => participant.user.id === viewerUserId);
  const lastMessage = conversation.messages?.[0] ?? null;
  const unreadCount = conversation.messages
    ? conversation.messages.filter(
        (message) =>
          message.senderId !== viewerUserId &&
          (!viewerParticipant?.lastReadAt || message.createdAt > viewerParticipant.lastReadAt),
      ).length
    : 0;

  return {
    id: conversation.id,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    counterpart,
    unreadCount,
    lastReadAt: viewerParticipant?.lastReadAt ?? null,
    lastMessage,
  };
}

export async function listDirectConversations(userId: string) {
  const conversations = await prisma.directConversation.findMany({
    where: {
      participants: {
        some: { userId },
      },
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              city: true,
              verification: true,
              avgRating: true,
              completedTrips: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              city: true,
              verification: true,
              avgRating: true,
              completedTrips: true,
            },
          },
        },
      },
    },
  });

  return conversations.map((conversation) => serializeDirectConversation(conversation, userId));
}

export async function listDirectMessages(conversationId: string, userId: string, cursor?: string, limit = 30) {
  await assertDirectConversationAccess(conversationId, userId);

  const messages = await prisma.directMessage.findMany({
    where: { conversationId },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          fullName: true,
          avatarUrl: true,
          city: true,
          verification: true,
          avgRating: true,
          completedTrips: true,
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

export async function sendDirectMessage(
  conversationId: string,
  userId: string,
  data: SendDirectMessageInput,
) {
  const participant = await assertDirectConversationAccess(conversationId, userId);
  const content = normalizeContent(data.content);

  if (!content) {
    throw new BadRequestError('Message cannot be empty');
  }

  const sanitized = sanitizeChatContent(content);

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.directMessage.create({
      data: {
        conversationId,
        senderId: userId,
        content: sanitized.sanitized,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            city: true,
            verification: true,
            avgRating: true,
            completedTrips: true,
          },
        },
      },
    });

    await tx.directConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    await tx.directConversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: created.createdAt },
    });

    return created;
  });

  const recipientIds = participant.conversation.participants
    .map((entry) => entry.user.id)
    .filter((id) => id !== userId);

  emitUserEvent(userId, 'direct:message_created', { conversationId, message });
  for (const recipientId of recipientIds) {
    emitUserEvent(recipientId, 'direct:message_created', { conversationId, message });
  }
  emitDirectConversationEvent(conversationId, 'direct:message_created', { conversationId, message });

  if (recipientIds.length > 0) {
    await queueNotification({
      type: 'direct_message',
      title: `${message.sender?.fullName ?? 'A traveler'} sent you a message`,
      body: sanitized.sanitized.slice(0, 160),
      userIds: recipientIds,
      ctaUrl: `${env.FRONTEND_URL}/dashboard/messages`,
      metadata: { conversationId, messageId: message.id },
    });
  }

  return message;
}

export async function markDirectConversationRead(conversationId: string, userId: string) {
  const participant = await assertDirectConversationAccess(conversationId, userId);

  return prisma.directConversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  });
}
