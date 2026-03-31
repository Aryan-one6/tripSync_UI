/**
 * tests/unit/chat.service.test.ts
 * Unit tests for src/modules/chat/service.ts
 * Covers: group messages, poll creation, poll voting, system messages, access control.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ─── Fixture helpers (inline, no import needed before mock setup) ─────────────
const TRAVELER_A_ID   = 'user-alice-001';
const TRAVELER_B_ID   = 'user-bob-002';
const GROUP_ID        = 'group-goa-001';
const MESSAGE_ID      = 'msg-001';
const POLL_MESSAGE_ID = 'poll-msg-001';
const OFFER_ID        = 'offer-himalayan-001';

function baseMember(userId: string, status = 'APPROVED') {
  return {
    id: `member-${userId}`, userId, groupId: GROUP_ID, role: 'MEMBER', status,
    joinedAt: new Date().toISOString(),
    user: { id: userId, fullName: 'Alice Traveler', avatarUrl: null },
  };
}

function baseMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: MESSAGE_ID, groupId: GROUP_ID, senderId: TRAVELER_A_ID,
    messageType: 'text', content: 'Hello, everyone!', metadata: null,
    createdAt: new Date().toISOString(),
    sender: { id: TRAVELER_A_ID, fullName: 'Alice Traveler', avatarUrl: null },
    ...overrides,
  };
}

// ─── vi.hoisted: create stubs BEFORE vi.mock factories are run ───────────────
const mocks = vi.hoisted(() => ({
  prisma: {
    groupMember: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    chatMessage:  { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    user:         { findUnique: vi.fn() },
    agency:       { findUnique: vi.fn() },
    offer:        { findFirst: vi.fn() },
    group:        { findUnique: vi.fn() },
    directConversationParticipant: { findUnique: vi.fn(), update: vi.fn() },
    directConversation: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    directMessage: { findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
  emitGroupEvent: vi.fn(),
  emitUserEvent: vi.fn(),
  emitDirectConversationEvent: vi.fn(),
  queueNotification: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/lib/socket.js', () => ({
  emitGroupEvent: mocks.emitGroupEvent,
  emitUserEvent: mocks.emitUserEvent,
  emitDirectConversationEvent: mocks.emitDirectConversationEvent,
}));
vi.mock('../../src/lib/queue.js', () => ({
  queueNotification: mocks.queueNotification,
}));

import * as chatService from '../../src/modules/chat/service.js';

// In Vitest module isolation, instanceof checks fail across module boundaries.
// We match on statusCode instead.
async function expectStatus(promise: Promise<unknown>, code: number) {
  try {
    await promise;
    expect.fail('Expected an error to be thrown');
  } catch (err: unknown) {
    expect((err as { statusCode?: number }).statusCode).toBe(code);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queueNotification.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ChatService — sendMessage', () => {
  it('creates and returns a text message for an approved group member', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    mocks.prisma.chatMessage.create.mockResolvedValue(baseMessage({ content: 'Hello team!' }));
    mocks.prisma.groupMember.findMany.mockResolvedValue([]);

    const msg = await chatService.sendMessage(GROUP_ID, TRAVELER_A_ID, { content: 'Hello team!' });

    expect(mocks.prisma.chatMessage.create).toHaveBeenCalledOnce();
    expect(msg.content).toBe('Hello team!');
    expect(msg.messageType).toBe('text');
  });

  it('400: whitespace-only content is rejected', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    await expectStatus(chatService.sendMessage(GROUP_ID, TRAVELER_A_ID, { content: '   ' }), 400);
  });

  it('strips HTML tags from message content', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    mocks.prisma.chatMessage.create.mockImplementation(async ({ data }: { data: { content: string } }) =>
      baseMessage({ content: data.content }),
    );
    mocks.prisma.groupMember.findMany.mockResolvedValue([]);

    const msg = await chatService.sendMessage(GROUP_ID, TRAVELER_A_ID, {
      content: '<b>Bold</b> and <script>evil()</script> text',
    });

    expect(msg.content).not.toContain('<');
    expect(msg.content).not.toContain('>');
    expect(msg.content).toContain('Bold');
    expect(msg.content).not.toContain('evil()');
  });

  it('403: user is not a group member', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(null);
    await expectStatus(chatService.sendMessage(GROUP_ID, TRAVELER_B_ID, { content: 'Hey!' }), 403);
  });

  it('403: member status is INTERESTED (not approved)', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID, 'INTERESTED'));
    await expectStatus(chatService.sendMessage(GROUP_ID, TRAVELER_A_ID, { content: 'Hey!' }), 403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ChatService — createPoll', () => {
  it('creates a poll message with structured option metadata', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    mocks.prisma.chatMessage.create.mockResolvedValue({
      ...baseMessage({ messageType: 'poll', content: 'Best departure time?' }),
      metadata: {
        options: [
          { id: 'option_1', label: 'Morning 8am', votes: [] },
          { id: 'option_2', label: 'Afternoon 2pm', votes: [] },
        ],
      },
    });
    mocks.prisma.groupMember.findMany.mockResolvedValue([]);

    const result = await chatService.createPoll(GROUP_ID, TRAVELER_A_ID, {
      question: 'Best departure time?',
      options: ['Morning 8am', 'Afternoon 2pm'],
    });

    expect(result.messageType).toBe('poll');
    const meta = result.metadata as { options: { votes: string[] }[] };
    expect(meta.options).toHaveLength(2);
    expect(meta.options[0].votes).toHaveLength(0);
  });

  it('403: non-members cannot create polls', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(null);
    await expectStatus(
      chatService.createPoll(GROUP_ID, 'outsider', { question: 'Who pays?', options: ['Alice', 'Bob'] }),
      403,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ChatService — voteOnPoll', () => {
  it('registers a vote for the selected option and removes old vote from other options', async () => {
    const pollMessage = {
      ...baseMessage({ messageType: 'poll', groupId: GROUP_ID }),
      metadata: {
        options: [
          { id: 'option_1', label: 'Morning', votes: [] },
          { id: 'option_2', label: 'Evening', votes: [TRAVELER_A_ID] }, // previously voted here
        ],
      },
    };

    const updated = {
      ...pollMessage,
      metadata: {
        options: [
          { id: 'option_1', label: 'Morning', votes: [TRAVELER_A_ID] },
          { id: 'option_2', label: 'Evening', votes: [] },
        ],
      },
    };

    mocks.prisma.chatMessage.findUnique.mockResolvedValue(pollMessage);
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    mocks.prisma.chatMessage.update.mockResolvedValue(updated);

    const result = await chatService.voteOnPoll(POLL_MESSAGE_ID, TRAVELER_A_ID, { optionId: 'option_1' });

    const meta = result.metadata as { options: { id: string; votes: string[] }[] };
    expect(meta.options.find((o) => o.id === 'option_1')?.votes).toContain(TRAVELER_A_ID);
    expect(meta.options.find((o) => o.id === 'option_2')?.votes).not.toContain(TRAVELER_A_ID);
  });

  it('404: poll message does not exist', async () => {
    mocks.prisma.chatMessage.findUnique.mockResolvedValue(null);
    await expectStatus(chatService.voteOnPoll('ghost-msg', TRAVELER_A_ID, { optionId: 'option_1' }), 404);
  });

  it('400: voting on a text message is rejected', async () => {
    mocks.prisma.chatMessage.findUnique.mockResolvedValue(baseMessage({ messageType: 'text', groupId: GROUP_ID }));
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    await expectStatus(chatService.voteOnPoll(MESSAGE_ID, TRAVELER_A_ID, { optionId: 'o1' }), 400);
  });

  it('400: optionId does not exist in the poll', async () => {
    mocks.prisma.chatMessage.findUnique.mockResolvedValue({
      ...baseMessage({ messageType: 'poll', groupId: GROUP_ID }),
      metadata: { options: [{ id: 'option_1', label: 'Yes', votes: [] }] },
    });
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    await expectStatus(chatService.voteOnPoll(MESSAGE_ID, TRAVELER_A_ID, { optionId: 'option_99' }), 400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ChatService — createSystemMessage', () => {
  it('creates a system message with null senderId', async () => {
    mocks.prisma.chatMessage.create.mockResolvedValue({
      ...baseMessage({ messageType: 'system', content: 'Offer accepted!' }),
      senderId: null,
    });

    const result = await chatService.createSystemMessage(
      GROUP_ID, 'Offer accepted!', { offerId: OFFER_ID },
    );

    expect(result.messageType).toBe('system');
    expect(result.senderId).toBeNull();
    expect(mocks.prisma.chatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ senderId: null, messageType: 'system' }),
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('ChatService — listMessages', () => {
  it('returns messages for approved members', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    mocks.prisma.chatMessage.findMany.mockResolvedValue([
      baseMessage({ id: 'msg-1' }),
      baseMessage({ id: 'msg-2' }),
    ]);

    const { messages, cursor } = await chatService.listMessages(GROUP_ID, TRAVELER_A_ID);

    expect(messages).toHaveLength(2);
    expect(cursor).toBeNull();
  });

  it('returns a cursor when exactly the default limit (30) messages are returned', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    const msgs = Array.from({ length: 30 }, (_, i) => baseMessage({ id: `msg-${i}` }));
    mocks.prisma.chatMessage.findMany.mockResolvedValue(msgs);

    const { cursor } = await chatService.listMessages(GROUP_ID, TRAVELER_A_ID);

    expect(cursor).toBe('msg-29');
  });

  it('403: non-member cannot list messages', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(null);
    await expectStatus(chatService.listMessages(GROUP_ID, 'not-a-member'), 403);
  });
});
