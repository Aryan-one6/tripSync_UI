/**
 * tests/helpers.ts
 *
 * Shared test utilities:
 *   - makeToken()     — signs a real JWT with the test secret
 *   - makePrisma()    — deep-mock of PrismaClient for unit tests
 *   - FIXTURES        — static data shared across test files
 */

import { SignJWT } from 'jose';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

// ─── JWT factory ─────────────────────────────────────────────────────────────

const ACCESS_SECRET = new TextEncoder().encode(
  'test-access-secret-32chars-exactly!!',
);

export interface TokenOpts {
  userId: string;
  role?: 'user' | 'agency_admin' | 'platform_admin';
  agencyId?: string;
  verification?: 'BASIC' | 'VERIFIED' | 'TRUSTED';
}

/**
 * Signs a real HS256 access token valid for 15 minutes.
 * The same secret is used by the API's `verifyAccessToken`.
 */
export async function makeToken(opts: TokenOpts): Promise<string> {
  return new SignJWT({
    userId: opts.userId,
    role: opts.role ?? 'user',
    agencyId: opts.agencyId,
    verification: opts.verification ?? 'BASIC',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(ACCESS_SECRET);
}

// ─── Static fixture IDs ───────────────────────────────────────────────────────

export const FIXTURES = {
  // Users
  TRAVELER_A_ID: 'user-alice-001',
  TRAVELER_B_ID: 'user-bob-002',
  AGENCY_OWNER_ID: 'user-agency-owner-003',

  // Agency
  AGENCY_ID: 'agency-001',
  AGENCY_NAME: 'Himalayan Trails',

  // Plan
  PLAN_ID: 'plan-goa-001',
  PLAN_TITLE: 'Goa Beach Trip',
  PLAN_SLUG: 'goa-beach-trip',

  // Group
  GROUP_ID: 'group-goa-001',

  // Offer
  OFFER_ID: 'offer-himalayan-001',
  OFFER_PRICE: 12000,

  // Messages
  MESSAGE_ID: 'msg-001',
  POLL_MESSAGE_ID: 'poll-msg-001',
} as const;

// ─── Prisma deep mock factory ─────────────────────────────────────────────────

/** Creates a fully-mocked Prisma client for unit tests. Override per-test. */
export function makePrisma() {
  return {
    offer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    offerNegotiation: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
    chatMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    groupMember: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    plan: {
      findUnique: vi.fn(),
    },
    agency: {
      findUnique: vi.fn(),
    },
    pollOption: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    directConversationParticipant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    directConversation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    directMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  };
}

export type MockPrisma = ReturnType<typeof makePrisma>;

// ─── Default fixture objects ──────────────────────────────────────────────────

export function makeAgency(overrides = {}) {
  return {
    id: FIXTURES.AGENCY_ID,
    name: FIXTURES.AGENCY_NAME,
    ownerId: FIXTURES.AGENCY_OWNER_ID,
    slug: 'himalayan-trails',
    logoUrl: null,
    avgRating: 4.5,
    totalReviews: 12,
    totalTrips: 8,
    ...overrides,
  };
}

export function makePlan(overrides = {}) {
  return {
    id: FIXTURES.PLAN_ID,
    slug: FIXTURES.PLAN_SLUG,
    title: FIXTURES.PLAN_TITLE,
    destination: 'Goa',
    creatorId: FIXTURES.TRAVELER_A_ID,
    status: 'OPEN',
    ...overrides,
  };
}

export function makeOffer(overrides = {}) {
  return {
    id: FIXTURES.OFFER_ID,
    planId: FIXTURES.PLAN_ID,
    agencyId: FIXTURES.AGENCY_ID,
    pricePerPerson: FIXTURES.OFFER_PRICE,
    status: 'PENDING',
    isReferred: false,
    pricingTiers: null,
    inclusions: { transport: true, hotel: true, meals: false },
    itinerary: null,
    cancellationPolicy: null,
    validUntil: new Date(Date.now() + 48 * 3_600_000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    negotiations: [],
    agency: makeAgency(),
    plan: makePlan(),
    ...overrides,
  };
}

export function makeChatMessage(overrides = {}) {
  return {
    id: FIXTURES.MESSAGE_ID,
    groupId: FIXTURES.GROUP_ID,
    senderId: FIXTURES.TRAVELER_A_ID,
    messageType: 'text',
    content: 'Hello, everyone!',
    metadata: null,
    createdAt: new Date().toISOString(),
    sender: {
      id: FIXTURES.TRAVELER_A_ID,
      fullName: 'Alice Traveler',
      username: 'alice',
      avatarUrl: null,
    },
    ...overrides,
  };
}

export function makeGroupMember(userId: string, role = 'MEMBER', status = 'APPROVED') {
  return {
    id: `member-${userId}`,
    userId,
    groupId: FIXTURES.GROUP_ID,
    role,
    status,
    joinedAt: new Date().toISOString(),
  };
}

/** Helper to cast vi.fn() to a typed Mock */
export function asMock<T extends (...args: unknown[]) => unknown>(fn: T): Mock {
  return fn as unknown as Mock;
}
