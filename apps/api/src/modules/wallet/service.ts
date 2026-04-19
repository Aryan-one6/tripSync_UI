/**
 * Wallet Service — TripSync
 *
 * Handles referral wallet management:
 * - Balance queries
 * - Credit/debit operations
 * - Transaction history
 * - Cashflow audit + reconciliation
 */

import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../lib/errors.js';
import { emitUserEvent } from '../../lib/socket.js';

type WalletDbClient = Prisma.TransactionClient | typeof prisma;
type WalletMutationReason =
  | 'referral_credit'
  | 'checkout_debit'
  | 'checkout_refund'
  | 'admin_adjustment'
  | 'manual';
type WalletTransactionType = 'referral_earned' | 'checkout_spent' | 'admin_credit' | 'admin_debit';

const MAX_WALLET_MUTATION_RUPEES = 2_00_000;
const MAX_RUPEE_DECIMALS = 2;
const EPSILON = 0.000001;

type WalletBalanceMutation = {
  amount: number;
  balance: number;
};

function isPrismaRootClient(client: WalletDbClient): client is typeof prisma {
  return '$transaction' in client;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function normalizePositiveRupeeAmount(raw: number, fieldName = 'amount'): number {
  if (!Number.isFinite(raw)) {
    throw new BadRequestError(`${fieldName} must be a valid number`);
  }
  if (raw <= 0) {
    throw new BadRequestError(`${fieldName} must be positive`);
  }
  if (raw > MAX_WALLET_MUTATION_RUPEES) {
    throw new BadRequestError(
      `${fieldName} exceeds allowed limit of ₹${MAX_WALLET_MUTATION_RUPEES.toLocaleString('en-IN')}`,
    );
  }

  const rounded = Number(raw.toFixed(MAX_RUPEE_DECIMALS));
  if (Math.abs(raw - rounded) > EPSILON) {
    throw new BadRequestError(`${fieldName} can have at most 2 decimal places`);
  }

  return rounded;
}

function buildCreditIdempotencyKey(
  userId: string,
  type: WalletTransactionType,
  referenceId?: string,
): string {
  return `wallet_credit:${type}:${userId}:${referenceId ?? 'none'}`;
}

function buildDebitIdempotencyKey(paymentId: string): string {
  return `wallet_checkout:${paymentId}`;
}

async function getOrCreateWallet(
  tx: WalletDbClient,
  userId: string,
) {
  const existing = await tx.referralWallet.findUnique({
    where: { userId },
    select: { id: true, balance: true, totalEarned: true, totalSpent: true },
  });

  if (existing) {
    return existing;
  }

  return tx.referralWallet.create({
    data: { userId },
    select: { id: true, balance: true, totalEarned: true, totalSpent: true },
  });
}

export function emitWalletBalanceUpdated(
  userId: string,
  payload: {
    balance: number;
    delta: number;
    reason: WalletMutationReason;
    relatedPaymentId?: string | null;
    relatedReferralId?: string | null;
  },
) {
  emitUserEvent(userId, 'wallet:balance-updated', {
    userId,
    balance: Number(payload.balance.toFixed(2)),
    delta: Number(payload.delta.toFixed(2)),
    reason: payload.reason,
    relatedPaymentId: payload.relatedPaymentId ?? null,
    relatedReferralId: payload.relatedReferralId ?? null,
    timestamp: new Date().toISOString(),
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getWalletBalance(userId: string): Promise<number> {
  const wallet = await prisma.referralWallet.findUnique({
    where: { userId },
    select: { balance: true },
  });

  if (!wallet) {
    const newWallet = await prisma.referralWallet.create({
      data: { userId },
      select: { balance: true },
    });
    return Number(newWallet.balance);
  }

  return Number(wallet.balance);
}

export async function addToWallet(
  txOrPrisma: WalletDbClient,
  userId: string,
  amountRupees: number,
  description: string,
  type: WalletTransactionType,
  referenceId?: string, // referralId or paymentId
  idempotencyKey?: string,
): Promise<number> {
  const amount = normalizePositiveRupeeAmount(amountRupees, 'credit amount');
  const resolvedKey = idempotencyKey ?? buildCreditIdempotencyKey(userId, type, referenceId);

  const mutate = async (tx: WalletDbClient): Promise<WalletBalanceMutation> => {
    const existingTx = await tx.referralWalletTransaction.findUnique({
      where: { idempotencyKey: resolvedKey },
      select: { amount: true, walletId: true },
    });

    if (existingTx) {
      const existingWallet = await tx.referralWallet.findUnique({
        where: { id: existingTx.walletId },
        select: { balance: true },
      });
      return {
        amount: Number(existingTx.amount),
        balance: Number(existingWallet?.balance ?? 0),
      };
    }

    const wallet = await getOrCreateWallet(tx, userId);

    const newBalance = new Decimal(wallet.balance).plus(amount);
    const newTotalEarned =
      type === 'referral_earned' || type === 'admin_credit'
        ? new Decimal(wallet.totalEarned).plus(amount)
        : wallet.totalEarned;

    await tx.referralWallet.update({
      where: { userId },
      data: {
        balance: newBalance,
        totalEarned: newTotalEarned,
      },
    });

    await tx.referralWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount: new Decimal(amount),
        description,
        referenceId,
        referralId: type === 'referral_earned' ? referenceId : null,
        paymentId: type === 'checkout_spent' ? referenceId : null,
        idempotencyKey: resolvedKey,
      },
    });

    return {
      amount,
      balance: Number(newBalance),
    };
  };

  if (!isPrismaRootClient(txOrPrisma)) {
    const result = await mutate(txOrPrisma);
    return result.balance;
  }

  let result: WalletBalanceMutation;
  try {
    result = await txOrPrisma.$transaction(
      async (tx) => mutate(tx),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existingTx = await txOrPrisma.referralWalletTransaction.findUnique({
      where: { idempotencyKey: resolvedKey },
      select: { amount: true, wallet: { select: { balance: true } } },
    });

    if (!existingTx) {
      throw error;
    }

    result = {
      amount: Number(existingTx.amount),
      balance: Number(existingTx.wallet.balance),
    };
  }

  emitWalletBalanceUpdated(userId, {
    balance: result.balance,
    delta: result.amount,
    reason: type === 'referral_earned' ? 'referral_credit' : 'admin_adjustment',
    relatedReferralId: type === 'referral_earned' ? referenceId ?? null : null,
    relatedPaymentId: type === 'checkout_spent' ? referenceId ?? null : null,
  });

  return result.balance;
}

export async function deductFromWallet(
  txOrPrisma: WalletDbClient,
  userId: string,
  amountRupees: number,
  paymentId: string,
  idempotencyKey?: string,
): Promise<number> {
  if (!paymentId || !paymentId.trim()) {
    throw new BadRequestError('paymentId is required for wallet deduction');
  }

  const amount = normalizePositiveRupeeAmount(amountRupees, 'wallet deduction');
  const resolvedKey = idempotencyKey ?? buildDebitIdempotencyKey(paymentId);

  const mutate = async (tx: WalletDbClient): Promise<WalletBalanceMutation> => {
    const existingTx = await tx.referralWalletTransaction.findUnique({
      where: { idempotencyKey: resolvedKey },
      select: { amount: true, walletId: true, paymentId: true },
    });

    if (existingTx) {
      const existingWallet = await tx.referralWallet.findUnique({
        where: { id: existingTx.walletId },
        select: { balance: true },
      });
      return {
        amount: Number(existingTx.amount),
        balance: Number(existingWallet?.balance ?? 0),
      };
    }

    const wallet = await tx.referralWallet.findUnique({
      where: { userId },
      select: { id: true, balance: true, totalSpent: true },
    });

    if (!wallet) {
      throw new NotFoundError('User wallet not found');
    }

    const balance = Number(wallet.balance);
    if (balance < amount) {
      throw new BadRequestError(
        `Insufficient wallet balance. Available: ₹${balance.toLocaleString('en-IN')}, Requested: ₹${amount.toLocaleString('en-IN')}`,
      );
    }

    const newBalance = new Decimal(balance).minus(amount);
    const newTotalSpent = new Decimal(wallet.totalSpent || 0).plus(amount);

    await tx.referralWallet.update({
      where: { userId },
      data: {
        balance: newBalance,
        totalSpent: newTotalSpent,
      },
    });

    await tx.referralWalletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'checkout_spent',
        amount: new Decimal(-amount),
        description: `Payment for booking ${paymentId}`,
        paymentId,
        idempotencyKey: resolvedKey,
      },
    });

    return {
      amount: -amount,
      balance: Number(newBalance),
    };
  };

  if (!isPrismaRootClient(txOrPrisma)) {
    const result = await mutate(txOrPrisma);
    return Math.abs(result.amount);
  }

  let result: WalletBalanceMutation;
  try {
    result = await txOrPrisma.$transaction(
      async (tx) => mutate(tx),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existingTx = await txOrPrisma.referralWalletTransaction.findUnique({
      where: { idempotencyKey: resolvedKey },
      select: { amount: true, wallet: { select: { balance: true } } },
    });

    if (!existingTx) {
      throw error;
    }

    result = {
      amount: Number(existingTx.amount),
      balance: Number(existingTx.wallet.balance),
    };
  }

  emitWalletBalanceUpdated(userId, {
    balance: result.balance,
    delta: result.amount,
    reason: 'checkout_debit',
    relatedPaymentId: paymentId,
  });

  return Math.abs(result.amount);
}

export async function getWalletTransactionHistory(
  userId: string,
  page = 1,
  pageSize = 50,
  filterType?: WalletTransactionType,
) {
  const wallet = await prisma.referralWallet.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!wallet) {
    throw new NotFoundError('User wallet not found');
  }

  const sanitizedPage = Math.max(1, page);
  const sanitizedPageSize = Math.min(100, Math.max(1, pageSize));
  const skip = (sanitizedPage - 1) * sanitizedPageSize;

  const [transactions, total] = await Promise.all([
    prisma.referralWalletTransaction.findMany({
      where: {
        walletId: wallet.id,
        ...(filterType ? { type: filterType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: sanitizedPageSize,
    }),
    prisma.referralWalletTransaction.count({
      where: {
        walletId: wallet.id,
        ...(filterType ? { type: filterType } : {}),
      },
    }),
  ]);

  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      referralId: t.referralId,
      paymentId: t.paymentId,
      createdAt: t.createdAt,
    })),
    pagination: {
      page: sanitizedPage,
      pageSize: sanitizedPageSize,
      total,
      pages: Math.ceil(total / sanitizedPageSize),
    },
  };
}

export async function getWalletMonthlySummary(userId: string, monthsBack = 12) {
  const wallet = await prisma.referralWallet.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!wallet) {
    throw new NotFoundError('User wallet not found');
  }

  const boundedMonths = Math.min(36, Math.max(1, monthsBack));

  const transactions = await prisma.referralWalletTransaction.findMany({
    where: {
      walletId: wallet.id,
      createdAt: {
        gte: new Date(new Date().setMonth(new Date().getMonth() - boundedMonths)),
      },
    },
  });

  const monthlyData: Record<
    string,
    {
      month: string;
      referral_earned: number;
      checkout_spent: number;
      admin_credit: number;
      admin_debit: number;
      net: number;
    }
  > = {};

  transactions.forEach((t) => {
    const monthKey = new Date(t.createdAt).toISOString().slice(0, 7);

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        referral_earned: 0,
        checkout_spent: 0,
        admin_credit: 0,
        admin_debit: 0,
        net: 0,
      };
    }

    const amount = Number(t.amount);
    monthlyData[monthKey][t.type] += Math.abs(amount);
    monthlyData[monthKey].net += amount;
  });

  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getCashflowAudit(startDate: Date, endDate: Date) {
  if (startDate > endDate) {
    throw new BadRequestError('startDate must be before endDate');
  }

  const transactions = await prisma.referralWalletTransaction.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      wallet: {
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const summary = {
    totalCredit: 0,
    totalDebit: 0,
    transactionCount: 0,
    byType: {
      referral_earned: 0,
      checkout_spent: 0,
      admin_credit: 0,
      admin_debit: 0,
    },
  };

  transactions.forEach((t) => {
    const amount = Number(t.amount);
    if (amount > 0) {
      summary.totalCredit += amount;
    } else {
      summary.totalDebit += Math.abs(amount);
    }
    summary.transactionCount++;
    summary.byType[t.type] += amount;
  });

  return {
    summary,
    transactions: transactions.map((t) => ({
      id: t.id,
      userId: t.wallet.userId,
      user: t.wallet.user,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      referralId: t.referralId,
      paymentId: t.paymentId,
      createdAt: t.createdAt,
    })),
  };
}

export async function getReconciliationReport(startDate: Date, endDate: Date) {
  if (startDate > endDate) {
    throw new BadRequestError('startDate must be before endDate');
  }

  const walletCheckouts = await prisma.referralWalletTransaction.findMany({
    where: {
      type: 'checkout_spent',
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      paymentId: true,
      amount: true,
    },
  });

  const paymentIds = walletCheckouts
    .map((t) => t.paymentId)
    .filter((id): id is string => id !== null && id !== undefined);

  const payments = await prisma.payment.findMany({
    where: {
      id: { in: paymentIds },
    },
    select: {
      id: true,
      walletAmountUsed: true,
      createdAt: true,
    },
  });

  const discrepancies: Array<{
    paymentId: string;
    walletAmount: number;
    paymentAmount: number;
    difference: number;
  }> = [];

  payments.forEach((payment) => {
    const walletTx = walletCheckouts.find((t) => t.paymentId === payment.id);
    if (!walletTx) return;

    const walletAmount = Math.abs(Number(walletTx.amount));
    const paymentAmount = Number(payment.walletAmountUsed);

    if (Math.abs(walletAmount - paymentAmount) > EPSILON) {
      discrepancies.push({
        paymentId: payment.id,
        walletAmount,
        paymentAmount,
        difference: walletAmount - paymentAmount,
      });
    }
  });

  const totalWalletAmount = walletCheckouts.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + Number(p.walletAmountUsed), 0);

  return {
    reconciliationStatus: discrepancies.length === 0 ? 'OK' : 'DISCREPANCIES_FOUND',
    totalWalletAmount,
    totalPaymentAmount,
    difference: totalWalletAmount - totalPaymentAmount,
    discrepancies,
    discrepancyCount: discrepancies.length,
  };
}
