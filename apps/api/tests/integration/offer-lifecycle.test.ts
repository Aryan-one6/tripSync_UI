/**
 * tests/integration/offer-lifecycle.test.ts
 * End-to-end offer lifecycle flow:
 *   1. Agency submits offer → PENDING
 *   2. User counters (round 1) → COUNTERED
 *   3a. User accepts → ACCEPTED + system chat message
 *   3b. Agency counters back (round 2) → COUNTERED
 *   4b. User accepts final counter → ACCEPTED
 *   Also covers: rejection flow, withdrawal, and max-round guard.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';

// ─── Constants ────────────────────────────────────────────────────────────────
const AGENCY_OWNER_ID = 'user-agency-owner-003';
const TRAVELER_A_ID  = 'user-alice-001';
const AGENCY_ID      = 'agency-001';
const PLAN_ID        = '00000000-0000-0000-0000-000000000001'; // must be UUID for CreateOfferSchema
const OFFER_ID       = 'offer-himalayan-001';
const GROUP_ID       = 'group-goa-001';
const OFFER_PRICE    = 12_000;

const ACCESS_SECRET = new TextEncoder().encode('test-access-secret-32chars-exactly!!');

async function makeToken(opts: { userId: string; role?: string; agencyId?: string }) {
  return new SignJWT({ userId: opts.userId, role: opts.role ?? 'user', agencyId: opts.agencyId, verification: 'BASIC' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('15m').sign(ACCESS_SECRET);
}

function baseAgency(o = {}) {
  return { id: AGENCY_ID, name: 'Himalayan Trails', ownerId: AGENCY_OWNER_ID, slug: 'himalayan-trails', logoUrl: null, avgRating: 4.5, ...o };
}
function basePlan(o = {}) {
  return { id: PLAN_ID, slug: 'goa', title: 'Goa Trip', destination: 'Goa', creatorId: TRAVELER_A_ID, status: 'OPEN', ...o };
}
function baseOffer(o = {}) {
  return { id: OFFER_ID, planId: PLAN_ID, agencyId: AGENCY_ID, pricePerPerson: OFFER_PRICE, status: 'PENDING', isReferred: false, pricingTiers: null, inclusions: {}, itinerary: null, cancellationPolicy: null, validUntil: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), negotiations: [], agency: baseAgency(), plan: basePlan(), ...o };
}

// ─── vi.hoisted: create stubs before vi.mock factories are hoisted ────────────
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
  acceptOfferForPlan: vi.fn(),
  createSystemMessage: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/modules/plans/service.js', () => ({ acceptOfferForPlan: mocks.acceptOfferForPlan }));
vi.mock('../../src/modules/chat/service.js', () => ({ createSystemMessage: mocks.createSystemMessage }));

import app from '../../src/app.js';

// ─────────────────────────────────────────────────────────────────────────────

let agencyToken: string;
let travelerToken: string;

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.acceptOfferForPlan.mockResolvedValue({ offer: baseOffer({ status: 'ACCEPTED' }) });
  mocks.createSystemMessage.mockResolvedValue({});

  [agencyToken, travelerToken] = await Promise.all([
    makeToken({ userId: AGENCY_OWNER_ID, role: 'agency_admin', agencyId: AGENCY_ID }),
    makeToken({ userId: TRAVELER_A_ID }),
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Offer Lifecycle — Full Negotiation Flow', () => {
  it('Step 1 — Agency submits a fresh offer on an OPEN plan', async () => {
    mocks.prisma.agency.findUnique.mockResolvedValue(baseAgency());
    mocks.prisma.plan.findUnique.mockResolvedValue(basePlan());
    mocks.prisma.offer.findUnique.mockResolvedValue(null);
    mocks.prisma.offer.create.mockResolvedValue(baseOffer());

    const res = await request(app)
      .post('/api/v1/offers')
      .set('Authorization', `Bearer ${agencyToken}`)
      .send({ planId: PLAN_ID, pricePerPerson: OFFER_PRICE });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.pricePerPerson).toBe(OFFER_PRICE);
  });

  it('Step 2 — Traveler counters offer at a lower price (round 1)', async () => {
    const COUNTER_PRICE = 10_000;
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ negotiations: [] }));
    // Prisma's $transaction receives array of resolved values, returns same array
    mocks.prisma.$transaction.mockImplementation(async (queries: unknown[]) => queries);
    mocks.prisma.offerNegotiation.create.mockReturnValue({ id: 'neg-001', round: 1, senderType: 'user', price: COUNTER_PRICE, message: "Can you do ₹10,000?", createdAt: new Date().toISOString() });
    mocks.prisma.offer.update.mockReturnValue(baseOffer({ status: 'COUNTERED', pricePerPerson: COUNTER_PRICE }));

    const res = await request(app)
      .post(`/api/v1/offers/${OFFER_ID}/counter`)
      .set('Authorization', `Bearer ${travelerToken}`)
      .send({ price: COUNTER_PRICE, message: "Can you do ₹10,000?" });

    expect(res.status).toBe(200);
    expect(res.body.data.round).toBe(1);
    expect(res.body.data.senderType).toBe('user');
    expect(res.body.data.price).toBe(COUNTER_PRICE);
  });

  it('Step 3a — Traveler accepts directly (happy-path accept)', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    mocks.prisma.group.findUnique.mockResolvedValue({ id: GROUP_ID });

    const res = await request(app)
      .post(`/api/v1/offers/${OFFER_ID}/accept`)
      .set('Authorization', `Bearer ${travelerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACCEPTED');
  });

  it('Step 3b — Agency counters user counter (round 2)', async () => {
    const AGENCY_COUNTER = 11_000;
    mocks.prisma.offer.findUnique.mockResolvedValue(
      baseOffer({ negotiations: [{ round: 1, senderType: 'user', price: 10000 }], status: 'COUNTERED' }),
    );
    mocks.prisma.$transaction.mockImplementation(async (queries: unknown[]) => queries);
    mocks.prisma.offerNegotiation.create.mockReturnValue({ id: 'neg-002', round: 2, senderType: 'agency', price: AGENCY_COUNTER, createdAt: new Date().toISOString() });
    mocks.prisma.offer.update.mockReturnValue(baseOffer({ status: 'COUNTERED', pricePerPerson: AGENCY_COUNTER }));

    const res = await request(app)
      .post(`/api/v1/offers/${OFFER_ID}/counter`)
      .set('Authorization', `Bearer ${agencyToken}`)
      .send({ price: AGENCY_COUNTER, message: "Best we can do." });

    expect(res.status).toBe(200);
    expect(res.body.data.round).toBe(2);
    expect(res.body.data.senderType).toBe('agency');
  });

  it('Step 4 — User accepts the final counter offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(
      baseOffer({ status: 'COUNTERED', negotiations: [{ round: 1, senderType: 'user' }, { round: 2, senderType: 'agency' }] }),
    );
    mocks.prisma.group.findUnique.mockResolvedValue({ id: GROUP_ID });

    const res = await request(app)
      .post(`/api/v1/offers/${OFFER_ID}/accept`)
      .set('Authorization', `Bearer ${travelerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACCEPTED');
  });

  it('Step 5 — System message is created in group chat after acceptance', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    mocks.prisma.group.findUnique.mockResolvedValue({ id: GROUP_ID });

    await request(app)
      .post(`/api/v1/offers/${OFFER_ID}/accept`)
      .set('Authorization', `Bearer ${travelerToken}`);

    expect(mocks.createSystemMessage).toHaveBeenCalledWith(
      GROUP_ID,
      expect.stringContaining('accepted'),
      expect.objectContaining({ offerId: OFFER_ID }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Offer Lifecycle — Rejection Flow', () => {
  it('User declines the offer after round 1 counter', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(
      baseOffer({ status: 'COUNTERED', negotiations: [{ round: 1, senderType: 'agency' }] }),
    );
    mocks.prisma.offer.update.mockResolvedValue(baseOffer({ status: 'REJECTED' }));

    const res = await request(app)
      .post(`/api/v1/offers/${OFFER_ID}/reject`)
      .set('Authorization', `Bearer ${travelerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');
  });

  it('Agency withdraws offer before user responds', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ status: 'PENDING' }));
    mocks.prisma.offer.update.mockResolvedValue(baseOffer({ status: 'WITHDRAWN' }));

    const res = await request(app)
      .post(`/api/v1/offers/${OFFER_ID}/withdraw`)
      .set('Authorization', `Bearer ${agencyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('WITHDRAWN');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Offer Lifecycle — Max Rounds Guard', () => {
  it('Blocks a 4th negotiation round (max=3)', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(
      baseOffer({
        status: 'COUNTERED',
        negotiations: [
          { round: 1, senderType: 'user' },
          { round: 2, senderType: 'agency' },
          { round: 3, senderType: 'user' },
        ],
      }),
    );

    const res = await request(app)
      .post(`/api/v1/offers/${OFFER_ID}/counter`)
      .set('Authorization', `Bearer ${agencyToken}`)
      .send({ price: 9000 });

    expect(res.status).toBe(400);
  });
});
