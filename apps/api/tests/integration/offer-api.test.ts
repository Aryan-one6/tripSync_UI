/**
 * tests/integration/offer-api.test.ts
 * HTTP-level integration tests for all Offer API endpoints.
 * Uses supertest with real JWT tokens and vi.hoisted() mocks.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';

// ─── Fixture constants ────────────────────────────────────────────────────────
const AGENCY_OWNER_ID = 'user-agency-owner-003';
const TRAVELER_A_ID  = 'user-alice-001';
const TRAVELER_B_ID  = 'user-bob-002';
const AGENCY_ID      = 'agency-001';
// UUIDs are required by the CreateOfferSchema (planId: z.string().uuid())
const PLAN_ID        = '00000000-0000-0000-0000-000000000001';
const OFFER_ID       = 'offer-himalayan-001';
const GROUP_ID       = 'group-goa-001';
const OFFER_PRICE    = 12_000;

const ACCESS_SECRET = new TextEncoder().encode('test-access-secret-32chars-exactly!!');

async function makeToken(opts: { userId: string; role?: string; agencyId?: string }) {
  return new SignJWT({ userId: opts.userId, role: opts.role ?? 'user', agencyId: opts.agencyId, verification: 'BASIC' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(ACCESS_SECRET);
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

// ─── vi.hoisted: create stubs before vi.mock hoisting ────────────────────────
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
let travelerAToken: string;
let travelerBToken: string;

beforeEach(async () => {
  vi.clearAllMocks();
  mocks.acceptOfferForPlan.mockResolvedValue({ offer: baseOffer({ status: 'ACCEPTED' }) });
  mocks.createSystemMessage.mockResolvedValue({});

  [agencyToken, travelerAToken, travelerBToken] = await Promise.all([
    makeToken({ userId: AGENCY_OWNER_ID, role: 'agency_admin', agencyId: AGENCY_ID }),
    makeToken({ userId: TRAVELER_A_ID }),
    makeToken({ userId: TRAVELER_B_ID }),
  ]);
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/offers — Submit Offer', () => {
  it('201: agency submits a valid offer', async () => {
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

  it('401: missing Authorization header', async () => {
    const res = await request(app).post('/api/v1/offers').send({ planId: PLAN_ID, pricePerPerson: 9000 });
    expect(res.status).toBe(401);
  });

  it('403: traveler (non-agency) cannot submit an offer', async () => {
    mocks.prisma.agency.findUnique.mockResolvedValue(null);
    const res = await request(app).post('/api/v1/offers').set('Authorization', `Bearer ${travelerAToken}`).send({ planId: PLAN_ID, pricePerPerson: 9000 });
    expect(res.status).toBe(403);
  });

  it('400: plan is not OPEN', async () => {
    mocks.prisma.agency.findUnique.mockResolvedValue(baseAgency());
    mocks.prisma.plan.findUnique.mockResolvedValue(basePlan({ status: 'CONFIRMED' }));
    const res = await request(app).post('/api/v1/offers').set('Authorization', `Bearer ${agencyToken}`).send({ planId: PLAN_ID, pricePerPerson: 9000 });
    expect(res.status).toBe(400);
  });

  it('404: plan does not exist', async () => {
    mocks.prisma.agency.findUnique.mockResolvedValue(baseAgency());
    mocks.prisma.plan.findUnique.mockResolvedValue(null);
    // Must use valid UUID — schema validates planId format before hitting service
    const ghostPlanId = '99999999-9999-9999-9999-999999999999';
    const res = await request(app).post('/api/v1/offers').set('Authorization', `Bearer ${agencyToken}`).send({ planId: ghostPlanId, pricePerPerson: 9000 });
    expect(res.status).toBe(404);
  });

  it('409: duplicate offer from same agency', async () => {
    mocks.prisma.agency.findUnique.mockResolvedValue(baseAgency());
    mocks.prisma.plan.findUnique.mockResolvedValue(basePlan());
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ isReferred: false, negotiations: [] }));
    const res = await request(app).post('/api/v1/offers').set('Authorization', `Bearer ${agencyToken}`).send({ planId: PLAN_ID, pricePerPerson: 11000 });
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/offers/:id — Get Offer', () => {
  it('200: plan creator can view the offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    const res = await request(app).get(`/api/v1/offers/${OFFER_ID}`).set('Authorization', `Bearer ${travelerAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(OFFER_ID);
  });

  it('200: agency owner can view their offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    const res = await request(app).get(`/api/v1/offers/${OFFER_ID}`).set('Authorization', `Bearer ${agencyToken}`);
    expect(res.status).toBe(200);
  });

  it('403: a different traveler cannot view the offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    const res = await request(app).get(`/api/v1/offers/${OFFER_ID}`).set('Authorization', `Bearer ${travelerBToken}`);
    expect(res.status).toBe(403);
  });

  it('404: offer does not exist', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/v1/offers/ghost').set('Authorization', `Bearer ${travelerAToken}`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/offers/:id/counter — Counter Offer', () => {
  // Prisma's $transaction([q1, q2]) receives an array of already-resolved query
  // results. Our mock returns the same array so destructuring [negotiation] works.
  function setupTransaction() {
    mocks.prisma.$transaction.mockImplementation(async (queries: unknown[]) => queries);
  }

  it('200: plan creator counters a PENDING offer (round 1)', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ negotiations: [] }));
    setupTransaction();
    mocks.prisma.offerNegotiation.create.mockReturnValue({ id: 'neg-001', round: 1, senderType: 'user', price: 10000, message: 'Please reduce', createdAt: new Date().toISOString() });
    mocks.prisma.offer.update.mockReturnValue(baseOffer({ status: 'COUNTERED' }));

    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/counter`).set('Authorization', `Bearer ${travelerAToken}`).send({ price: 10000, message: 'Please reduce' });

    expect(res.status).toBe(200);
    expect(res.body.data.round).toBe(1);
    expect(res.body.data.senderType).toBe('user');
  });

  it('200: agency counters after user counter (round 2)', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(
      baseOffer({ negotiations: [{ round: 1, senderType: 'user', price: 10000 }], status: 'COUNTERED' }),
    );
    setupTransaction();
    mocks.prisma.offerNegotiation.create.mockReturnValue({ id: 'neg-002', round: 2, senderType: 'agency', price: 11000, createdAt: new Date().toISOString() });
    mocks.prisma.offer.update.mockReturnValue(baseOffer({ status: 'COUNTERED' }));

    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/counter`).set('Authorization', `Bearer ${agencyToken}`).send({ price: 11000 });

    expect(res.status).toBe(200);
    expect(res.body.data.senderType).toBe('agency');
  });

  it('400: exceeds max 3 rounds', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(
      baseOffer({
        negotiations: [
          { round: 1, senderType: 'user' }, { round: 2, senderType: 'agency' }, { round: 3, senderType: 'user' },
        ],
        status: 'COUNTERED',
      }),
    );
    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/counter`).set('Authorization', `Bearer ${agencyToken}`).send({ price: 9000 });
    expect(res.status).toBe(400);
  });

  it('400: same party sends two counters in a row', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(
      baseOffer({ negotiations: [{ round: 1, senderType: 'user', price: 9000 }], status: 'COUNTERED' }),
    );
    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/counter`).set('Authorization', `Bearer ${travelerAToken}`).send({ price: 8000 });
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/offers/:id/accept — Accept Offer', () => {
  it('200: plan creator accepts a PENDING offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    mocks.prisma.group.findUnique.mockResolvedValue({ id: GROUP_ID });
    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/accept`).set('Authorization', `Bearer ${travelerAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ACCEPTED');
  });

  it('403: non-creator cannot accept', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/accept`).set('Authorization', `Bearer ${travelerBToken}`);
    expect(res.status).toBe(403);
  });

  it('403: agency cannot accept their own offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/accept`).set('Authorization', `Bearer ${agencyToken}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/offers/:id/reject — Reject Offer', () => {
  it('200: plan creator rejects a PENDING offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    mocks.prisma.offer.update.mockResolvedValue(baseOffer({ status: 'REJECTED' }));
    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/reject`).set('Authorization', `Bearer ${travelerAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');
  });

  it('400: cannot reject an already-accepted offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ status: 'ACCEPTED' }));
    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/reject`).set('Authorization', `Bearer ${travelerAToken}`);
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/offers/:id/withdraw — Withdraw Offer', () => {
  it('200: agency withdraws their PENDING offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    mocks.prisma.offer.update.mockResolvedValue(baseOffer({ status: 'WITHDRAWN' }));
    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/withdraw`).set('Authorization', `Bearer ${agencyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('WITHDRAWN');
  });

  it('403: traveler cannot withdraw an agency offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/withdraw`).set('Authorization', `Bearer ${travelerAToken}`);
    expect(res.status).toBe(403);
  });

  it('400: cannot withdraw an ACCEPTED offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ status: 'ACCEPTED' }));
    const res = await request(app).post(`/api/v1/offers/${OFFER_ID}/withdraw`).set('Authorization', `Bearer ${agencyToken}`);
    expect(res.status).toBe(400);
  });
});
