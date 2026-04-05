/**
 * tests/unit/offer.service.test.ts
 *
 * Unit tests for src/modules/offers/service.ts
 * All Prisma calls are mocked — no real database needed.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const AGENCY_OWNER_ID = 'user-agency-owner-003';
const TRAVELER_A_ID  = 'user-alice-001';
const TRAVELER_B_ID  = 'user-bob-002';
const AGENCY_ID      = 'agency-001';
const PLAN_ID        = 'plan-goa-001';
const OFFER_ID       = 'offer-himalayan-001';
const GROUP_ID       = 'group-goa-001';
const OFFER_PRICE    = 12_000;

function baseAgency(o = {}) {
  return { id: AGENCY_ID, name: 'Himalayan Trails', ownerId: AGENCY_OWNER_ID, slug: 'himalayan-trails', logoUrl: null, avgRating: 4.5, ...o };
}
function basePlan(o = {}) {
  return { id: PLAN_ID, slug: 'goa', title: 'Goa Trip', destination: 'Goa', creatorId: TRAVELER_A_ID, status: 'OPEN', ...o };
}
function baseOffer(o = {}) {
  return { id: OFFER_ID, planId: PLAN_ID, agencyId: AGENCY_ID, pricePerPerson: OFFER_PRICE, status: 'PENDING', isReferred: false, pricingTiers: null, inclusions: {}, itinerary: null, cancellationPolicy: null, validUntil: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), negotiations: [], agency: baseAgency(), plan: basePlan(), ...o };
}

const mocks = vi.hoisted(() => ({
  prisma: {
    offer:            { findUnique: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    offerNegotiation: { create: vi.fn() },
    $transaction:     vi.fn(),
    chatMessage:      { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    group:            { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    groupMember:      { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    plan:             { findUnique: vi.fn() },
    agency:           { findUnique: vi.fn() },
    agencyMember:     { findUnique: vi.fn(), findFirst: vi.fn() },
    user:             { findUnique: vi.fn() },
    notification:     { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
  acceptOfferForPlan: vi.fn(),
  createSystemMessage: vi.fn(),
}));

vi.mock('../../src/lib/prisma.js', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/modules/plans/service.js', () => ({ acceptOfferForPlan: mocks.acceptOfferForPlan }));
vi.mock('../../src/modules/chat/service.js', () => ({ createSystemMessage: mocks.createSystemMessage }));

import * as offerService from '../../src/modules/offers/service.js';

// NOTE: In Vitest with module isolation, subclass instanceof checks fail across
// module boundaries. We match on statusCode instead — which is reliable.
async function expectStatus(promise: Promise<unknown>, code: number) {
  try {
    await promise;
    expect.fail('Expected an error to be thrown, but none was');
  } catch (err: unknown) {
    expect((err as { statusCode?: number }).statusCode).toBe(code);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.acceptOfferForPlan.mockResolvedValue({ offer: baseOffer({ status: 'ACCEPTED' }) });
  mocks.createSystemMessage.mockResolvedValue({});
  mocks.prisma.notification.create.mockResolvedValue({
    id: 'notif-unit-1',
    type: 'offer_updated',
    title: 'Test',
    body: 'Test',
    href: null,
    metadata: null,
    createdAt: new Date(),
    readAt: null,
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('OfferService — submitOffer', () => {
  it('creates a new offer when the agency has none on the plan', async () => {
    mocks.prisma.agency.findUnique.mockResolvedValue(baseAgency());
    mocks.prisma.plan.findUnique.mockResolvedValue(basePlan());
    mocks.prisma.offer.findUnique.mockResolvedValue(null);
    mocks.prisma.offer.create.mockResolvedValue(baseOffer());

    const result = await offerService.submitOffer(AGENCY_OWNER_ID, { planId: PLAN_ID, pricePerPerson: OFFER_PRICE });

    expect(mocks.prisma.offer.create).toHaveBeenCalledOnce();
    expect(result.status).toBe('PENDING');
    expect(result.pricePerPerson).toBe(OFFER_PRICE);
  });

  it('403: ForbiddenError when user is not an agency owner', async () => {
    mocks.prisma.agency.findUnique.mockResolvedValue(null);
    await expectStatus(offerService.submitOffer(TRAVELER_A_ID, { planId: PLAN_ID, pricePerPerson: 10000 }), 403);
  });

  it('404: NotFoundError when the plan does not exist', async () => {
    mocks.prisma.agency.findUnique.mockResolvedValue(baseAgency());
    mocks.prisma.plan.findUnique.mockResolvedValue(null);
    await expectStatus(offerService.submitOffer(AGENCY_OWNER_ID, { planId: 'ghost', pricePerPerson: 10000 }), 404);
  });

  it('400: BadRequestError when plan status is not OPEN', async () => {
    mocks.prisma.agency.findUnique.mockResolvedValue(baseAgency());
    mocks.prisma.plan.findUnique.mockResolvedValue(basePlan({ status: 'CONFIRMED' }));
    await expectStatus(offerService.submitOffer(AGENCY_OWNER_ID, { planId: PLAN_ID, pricePerPerson: 9000 }), 400);
  });

  it('409: ConflictError when agency already has an active offer', async () => {
    mocks.prisma.agency.findUnique.mockResolvedValue(baseAgency());
    mocks.prisma.plan.findUnique.mockResolvedValue(basePlan());
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ isReferred: false, negotiations: [] }));
    await expectStatus(offerService.submitOffer(AGENCY_OWNER_ID, { planId: PLAN_ID, pricePerPerson: 11000 }), 409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('OfferService — counterOffer', () => {
  it('creates round-1 counter by the plan creator (user side)', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ negotiations: [] }));
    mocks.prisma.$transaction.mockImplementation(async (queries: unknown[]) => queries);
    mocks.prisma.offerNegotiation.create.mockReturnValue({ id: 'neg-001', round: 1, senderType: 'user', price: 10000, message: 'Reduce plz' });
    mocks.prisma.offer.update.mockReturnValue(baseOffer({ status: 'COUNTERED' }));

    const result = await offerService.counterOffer(OFFER_ID, TRAVELER_A_ID, { price: 10000, message: 'Reduce plz' });

    expect(result.round).toBe(1);
    expect(result.senderType).toBe('user');
    expect(result.price).toBe(10000);
  });

  it('creates round-2 counter by the agency after user counter', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(
      baseOffer({ negotiations: [{ round: 1, senderType: 'user', price: 10000 }], status: 'COUNTERED' }),
    );
    mocks.prisma.$transaction.mockImplementation(async (queries: unknown[]) => queries);
    mocks.prisma.offerNegotiation.create.mockReturnValue({ id: 'neg-002', round: 2, senderType: 'agency', price: 11000 });
    mocks.prisma.offer.update.mockReturnValue(baseOffer({ status: 'COUNTERED' }));

    const result = await offerService.counterOffer(OFFER_ID, AGENCY_OWNER_ID, { price: 11000 });

    expect(result.round).toBe(2);
    expect(result.senderType).toBe('agency');
  });

  it('400: BadRequestError when max 3 negotiation rounds exceeded', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(
      baseOffer({ negotiations: [{ round: 1, senderType: 'user' }, { round: 2, senderType: 'agency' }, { round: 3, senderType: 'user' }], status: 'COUNTERED' }),
    );
    await expectStatus(offerService.counterOffer(OFFER_ID, AGENCY_OWNER_ID, { price: 9500 }), 400);
  });

  it('400: BadRequestError when same party counters twice in a row', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(
      baseOffer({ negotiations: [{ round: 1, senderType: 'user', price: 9000 }], status: 'COUNTERED' }),
    );
    await expectStatus(offerService.counterOffer(OFFER_ID, TRAVELER_A_ID, { price: 8500 }), 400);
  });

  it('403: ForbiddenError when neither creator nor agency counters', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ negotiations: [] }));
    await expectStatus(offerService.counterOffer(OFFER_ID, 'random-user', { price: 9000 }), 403);
  });

  it('404: NotFoundError when the offer does not exist', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(null);
    await expectStatus(offerService.counterOffer('ghost', TRAVELER_A_ID, { price: 10000 }), 404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('OfferService — accept', () => {
  it('allows plan creator to accept a PENDING offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    mocks.prisma.group.findUnique.mockResolvedValue({ id: GROUP_ID });

    const result = await offerService.accept(OFFER_ID, TRAVELER_A_ID);

    expect(result.status).toBe('ACCEPTED');
  });

  it('403: ForbiddenError when a non-creator tries to accept', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    await expectStatus(offerService.accept(OFFER_ID, TRAVELER_B_ID), 403);
  });

  it('404: NotFoundError when offer does not exist', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(null);
    await expectStatus(offerService.accept('ghost', TRAVELER_A_ID), 404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('OfferService — reject', () => {
  it('allows plan creator to reject a PENDING offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    mocks.prisma.offer.update.mockResolvedValue(baseOffer({ status: 'REJECTED' }));

    const result = await offerService.reject(OFFER_ID, TRAVELER_A_ID);

    expect(result.status).toBe('REJECTED');
    expect(mocks.prisma.offer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REJECTED' } }),
    );
  });

  it('allows creator to reject a COUNTERED offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ status: 'COUNTERED' }));
    mocks.prisma.offer.update.mockResolvedValue(baseOffer({ status: 'REJECTED' }));
    const result = await offerService.reject(OFFER_ID, TRAVELER_A_ID);
    expect(result.status).toBe('REJECTED');
  });

  it('403: ForbiddenError when a non-creator tries to reject', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    await expectStatus(offerService.reject(OFFER_ID, TRAVELER_B_ID), 403);
  });

  it('400: BadRequestError when offer is already ACCEPTED', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ status: 'ACCEPTED' }));
    await expectStatus(offerService.reject(OFFER_ID, TRAVELER_A_ID), 400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('OfferService — withdraw', () => {
  it('allows agency owner to withdraw a PENDING offer', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    mocks.prisma.offer.update.mockResolvedValue(baseOffer({ status: 'WITHDRAWN' }));
    const result = await offerService.withdraw(OFFER_ID, AGENCY_OWNER_ID);
    expect(result.status).toBe('WITHDRAWN');
  });

  it('403: ForbiddenError when a non-agency user tries to withdraw', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer());
    await expectStatus(offerService.withdraw(OFFER_ID, TRAVELER_A_ID), 403);
  });

  it('400: BadRequestError when offer is already ACCEPTED', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ status: 'ACCEPTED' }));
    await expectStatus(offerService.withdraw(OFFER_ID, AGENCY_OWNER_ID), 400);
  });

  it('400: BadRequestError when offer is already REJECTED', async () => {
    mocks.prisma.offer.findUnique.mockResolvedValue(baseOffer({ status: 'REJECTED' }));
    await expectStatus(offerService.withdraw(OFFER_ID, AGENCY_OWNER_ID), 400);
  });
});
