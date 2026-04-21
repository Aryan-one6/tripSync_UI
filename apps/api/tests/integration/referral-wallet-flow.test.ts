import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';

const ACCESS_SECRET = new TextEncoder().encode('test-access-secret-32chars-exactly!!');

async function makeUserToken(userId: string) {
  return new SignJWT({ userId, role: 'user', verification: 'BASIC' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(ACCESS_SECRET);
}

const mocks = vi.hoisted(() => {
  const tx = {
    referralTransaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    referralLink: {
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  };

  return {
    tx,
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      referralLink: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      referralTransaction: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
      },
      groupMember: {
        findUnique: vi.fn(),
      },
      payment: {
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    walletService: {
      getWalletBalance: vi.fn(),
      deductFromWallet: vi.fn(),
      addToWallet: vi.fn(),
      emitWalletBalanceUpdated: vi.fn(),
    },
  };
});

vi.mock('../../src/lib/prisma.js', () => ({ prisma: mocks.prisma }));
vi.mock('../../src/modules/wallet/service.js', () => mocks.walletService);

import app from '../../src/app.js';
import { emitUserEvent } from '../../src/lib/socket.js';

function travelerSignupPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Aryan One',
    username: 'aryan_one6',
    email: 'aryan.one6@example.com',
    phone: '9876543210',
    password: 'SuperSecure123',
    dateOfBirth: '2000-01-01',
    gender: 'male',
    city: 'Delhi',
    travelPreferences: 'Trekking, mountain trips, and weekend road journeys.',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mocks.prisma.user.findUnique.mockResolvedValue(null);
  mocks.prisma.user.create.mockResolvedValue({ id: 'user-new-001' });

  mocks.tx.referralTransaction.findUnique.mockResolvedValue(null);
  mocks.tx.referralTransaction.create.mockResolvedValue({
    id: 'referral-tx-001',
    status: 'INVITED',
  });
  mocks.tx.referralLink.updateMany.mockResolvedValue({ count: 1 });

  mocks.prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof mocks.tx) => Promise<unknown>)(mocks.tx);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return null;
  });

  mocks.walletService.getWalletBalance.mockResolvedValue(100);
});

describe('Referral Signup Flow', () => {
  it('rejects malformed referral code format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup/traveler')
      .send(travelerSignupPayload({ referralCode: 'bad-code!' }));

    expect(res.status).toBe(400);
    expect(mocks.prisma.referralLink.findUnique).not.toHaveBeenCalled();
  });

  it('rejects expired referral code', async () => {
    mocks.prisma.referralLink.findUnique.mockResolvedValue({
      id: 'link-001',
      userId: 'referrer-001',
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      usedAt: null,
    });

    const res = await request(app)
      .post('/api/v1/auth/signup/traveler')
      .send(travelerSignupPayload({ referralCode: 'TSAB12CD' }));

    expect(res.status).toBe(400);
    expect(String(res.body.errors?.[0]?.message || '')).toContain('invalid or expired');
  });

  it('creates referral invite event on valid signup with referral code', async () => {
    mocks.prisma.referralLink.findUnique.mockResolvedValue({
      id: 'link-001',
      userId: 'referrer-001',
      expiresAt: new Date('2030-01-01T00:00:00.000Z'),
      usedAt: null,
    });

    const res = await request(app)
      .post('/api/v1/auth/signup/traveler')
      .send(travelerSignupPayload({ referralCode: 'TSAB12CD' }));

    expect(res.status).toBe(201);
    expect(mocks.tx.referralTransaction.create).toHaveBeenCalledOnce();
    expect(emitUserEvent).toHaveBeenCalledWith(
      'referrer-001',
      'referral:new-invite',
      expect.objectContaining({
        referralId: 'referral-tx-001',
        referrerId: 'referrer-001',
        referredUserId: 'user-new-001',
        status: 'INVITED',
      }),
    );
  });
});

describe('Wallet Checkout Flow', () => {
  it('prevents wallet deduction above available balance', async () => {
    const token = await makeUserToken('user-alice-001');

    mocks.prisma.groupMember.findUnique.mockResolvedValue({
      status: 'APPROVED',
      user: {
        id: 'user-alice-001',
        fullName: 'Alice',
        phone: '9999999999',
      },
      group: {
        id: 'group-001',
        members: [{ userId: 'user-alice-001', status: 'APPROVED' }],
        payments: [],
        plan: {
          id: 'plan-001',
          title: 'Kasol Escape',
          creatorId: 'user-alice-001',
          status: 'CONFIRMING',
          startDate: null,
          endDate: null,
          selectedOffer: {
            id: 'offer-001',
            pricePerPerson: 12000,
            agency: {
              id: 'agency-001',
              name: 'Mountain Trails',
              ownerId: 'agency-owner-001',
              phone: '8888888888',
            },
          },
        },
        package: null,
      },
    });

    mocks.walletService.getWalletBalance.mockResolvedValue(100);

    const res = await request(app)
      .post('/api/v1/payments/groups/group-001/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ walletAmountToUse: 500, pointsToRedeem: 0 });

    expect(res.status).toBe(400);
    expect(String(res.body.errors?.[0]?.message || '')).toContain('Cannot use ₹500 from wallet');
  });
});
