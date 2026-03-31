/**
 * tests/integration/chat-api.test.ts
 * HTTP-level integration tests for Chat API endpoints.
 * Uses supertest with real JWT tokens and vi.hoisted() mocks.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';

// ─── Fixture constants ────────────────────────────────────────────────────────
const TRAVELER_A_ID   = 'user-alice-001';
const TRAVELER_B_ID   = 'user-bob-002';
const GROUP_ID        = 'group-goa-001';
const MESSAGE_ID      = 'msg-001';
const POLL_MESSAGE_ID = 'poll-msg-001';
const ACCESS_SECRET   = new TextEncoder().encode('test-access-secret-32chars-exactly!!');

async function makeToken(opts: { userId: string; role?: string }) {
  return new SignJWT({ userId: opts.userId, role: opts.role ?? 'user', verification: 'BASIC' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('15m').sign(ACCESS_SECRET);
}

function baseMember(userId: string, status = 'APPROVED') {
  return { id: `m-${userId}`, userId, groupId: GROUP_ID, role: 'MEMBER', status, joinedAt: new Date().toISOString(), user: { id: userId, fullName: 'Alice', avatarUrl: null } };
}

function baseMessage(o: Record<string, unknown> = {}) {
  return { id: MESSAGE_ID, groupId: GROUP_ID, senderId: TRAVELER_A_ID, messageType: 'text', content: 'Hello!', metadata: null, createdAt: new Date().toISOString(), sender: { id: TRAVELER_A_ID, fullName: 'Alice', avatarUrl: null }, ...o };
}

// ─── vi.hoisted: create stubs before vi.mock factories run ───────────────────
const mocks = vi.hoisted(() => ({
  prisma: {
    offer:            { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    offerNegotiation: { create: vi.fn() },
    $transaction:     vi.fn(),
    chatMessage:      { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    group:            { findUnique: vi.fn(), findFirst: vi.fn() },
    groupMember:      { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    plan:             { findUnique: vi.fn() },
    agency:           { findUnique: vi.fn() },
    user:             { findUnique: vi.fn() },
    directConversationParticipant: { findUnique: vi.fn(), update: vi.fn() },
    directConversation: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), update: vi.fn() },
    directMessage: { findMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: mocks.prisma }));

import app from '../../src/app.js';

// ─────────────────────────────────────────────────────────────────────────────

let travelerAToken: string;
let travelerBToken: string;

beforeEach(async () => {
  vi.clearAllMocks();
  [travelerAToken, travelerBToken] = await Promise.all([
    makeToken({ userId: TRAVELER_A_ID }),
    makeToken({ userId: TRAVELER_B_ID }),
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/chat/groups/:groupId/messages', () => {
  it('200: list messages for approved group member', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    mocks.prisma.chatMessage.findMany.mockResolvedValue([
      baseMessage({ id: 'msg-1', content: 'Hello!' }),
      baseMessage({ id: 'msg-2', content: 'Ready for the trip?' }),
    ]);

    const res = await request(app)
      .get(`/api/v1/chat/groups/${GROUP_ID}/messages`)
      .set('Authorization', `Bearer ${travelerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toBeDefined();
  });

  it('401: request without token is rejected', async () => {
    const res = await request(app).get(`/api/v1/chat/groups/${GROUP_ID}/messages`);
    expect(res.status).toBe(401);
  });

  it('403: non-member is rejected', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(null);
    const res = await request(app).get(`/api/v1/chat/groups/${GROUP_ID}/messages`).set('Authorization', `Bearer ${travelerBToken}`);
    expect(res.status).toBe(403);
  });

  it('403: INTERESTED (not approved) member is rejected', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID, 'INTERESTED'));
    const res = await request(app).get(`/api/v1/chat/groups/${GROUP_ID}/messages`).set('Authorization', `Bearer ${travelerAToken}`);
    expect(res.status).toBe(403);
  });

  it('200: pagination cursor is returned when limit is hit', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    const msgs = Array.from({ length: 30 }, (_, i) => baseMessage({ id: `msg-${i}` }));
    mocks.prisma.chatMessage.findMany.mockResolvedValue(msgs);

    const res = await request(app).get(`/api/v1/chat/groups/${GROUP_ID}/messages`).set('Authorization', `Bearer ${travelerAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.cursor).toBe('msg-29');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/chat/groups/:groupId/messages — Send Message', () => {
  it('201: approved member sends a text message', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    mocks.prisma.chatMessage.create.mockResolvedValue(baseMessage({ content: "Let's go to Goa!" }));
    mocks.prisma.groupMember.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post(`/api/v1/chat/groups/${GROUP_ID}/messages`)
      .set('Authorization', `Bearer ${travelerAToken}`)
      .send({ content: "Let's go to Goa!" });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe("Let's go to Goa!");
    expect(res.body.data.messageType).toBe('text');
  });

  it('400: whitespace-only content is rejected', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    const res = await request(app)
      .post(`/api/v1/chat/groups/${GROUP_ID}/messages`)
      .set('Authorization', `Bearer ${travelerAToken}`)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
  });

  it('403: non-member cannot send messages', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(null);
    const res = await request(app).post(`/api/v1/chat/groups/${GROUP_ID}/messages`).set('Authorization', `Bearer ${travelerBToken}`).send({ content: 'Sneaking in!' });
    expect(res.status).toBe(403);
  });

  it('401: unauthenticated request is rejected', async () => {
    const res = await request(app).post(`/api/v1/chat/groups/${GROUP_ID}/messages`).send({ content: 'Anyone home?' });
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/chat/groups/:groupId/polls — Create Poll', () => {
  it('201: approved member creates a poll', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    mocks.prisma.chatMessage.create.mockResolvedValue({
      ...baseMessage({ messageType: 'poll', content: 'Departure time?' }),
      metadata: { options: [{ id: 'option_1', label: '7 AM', votes: [] }, { id: 'option_2', label: '10 AM', votes: [] }] },
    });
    mocks.prisma.groupMember.findMany.mockResolvedValue([]);

    const res = await request(app)
      .post(`/api/v1/chat/groups/${GROUP_ID}/polls`)
      .set('Authorization', `Bearer ${travelerAToken}`)
      .send({ question: 'Departure time?', options: ['7 AM', '10 AM'] });

    expect(res.status).toBe(201);
    expect(res.body.data.messageType).toBe('poll');
    const opts = (res.body.data.metadata as { options: { id: string }[] }).options;
    expect(opts).toHaveLength(2);
  });

  it('403: non-member cannot create polls', async () => {
    mocks.prisma.groupMember.findUnique.mockResolvedValue(null);
    const res = await request(app).post(`/api/v1/chat/groups/${GROUP_ID}/polls`).set('Authorization', `Bearer ${travelerBToken}`).send({ question: 'Sneak poll', options: ['Yes', 'No'] });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/chat/messages/:id/vote — Vote on Poll', () => {
  it('200: cast a vote for a poll option', async () => {
    const pollMsg = { ...baseMessage({ messageType: 'poll', groupId: GROUP_ID }), metadata: { options: [{ id: 'option_1', label: 'Morning', votes: [] }, { id: 'option_2', label: 'Evening', votes: [] }] } };
    const updated = { ...pollMsg, metadata: { options: [{ id: 'option_1', label: 'Morning', votes: [TRAVELER_A_ID] }, { id: 'option_2', label: 'Evening', votes: [] }] } };

    mocks.prisma.chatMessage.findUnique.mockResolvedValue(pollMsg);
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    mocks.prisma.chatMessage.update.mockResolvedValue(updated);

    const res = await request(app).post(`/api/v1/chat/messages/${POLL_MESSAGE_ID}/vote`).set('Authorization', `Bearer ${travelerAToken}`).send({ optionId: 'option_1' });

    expect(res.status).toBe(200);
    const meta = res.body.data.metadata as { options: { id: string; votes: string[] }[] };
    expect(meta.options.find((o) => o.id === 'option_1')?.votes).toContain(TRAVELER_A_ID);
  });

  it('404: voting on a non-existent message returns 404', async () => {
    mocks.prisma.chatMessage.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/chat/messages/ghost/vote').set('Authorization', `Bearer ${travelerAToken}`).send({ optionId: 'option_1' });
    expect(res.status).toBe(404);
  });

  it('400: voting on a text message returns 400', async () => {
    mocks.prisma.chatMessage.findUnique.mockResolvedValue(baseMessage({ messageType: 'text', groupId: GROUP_ID }));
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    const res = await request(app).post(`/api/v1/chat/messages/${MESSAGE_ID}/vote`).set('Authorization', `Bearer ${travelerAToken}`).send({ optionId: 'option_1' });
    expect(res.status).toBe(400);
  });

  it('400: voting for a non-existent optionId', async () => {
    mocks.prisma.chatMessage.findUnique.mockResolvedValue({ ...baseMessage({ messageType: 'poll', groupId: GROUP_ID }), metadata: { options: [{ id: 'option_1', label: 'Yes', votes: [] }] } });
    mocks.prisma.groupMember.findUnique.mockResolvedValue(baseMember(TRAVELER_A_ID));
    const res = await request(app).post(`/api/v1/chat/messages/${MESSAGE_ID}/vote`).set('Authorization', `Bearer ${travelerAToken}`).send({ optionId: 'option_99' });
    expect(res.status).toBe(400);
  });
});
