import { apiFetch, safeApiFetch } from "./client";

export interface WalletBalance {
  balance: number; // in rupees
}

export interface WalletTransaction {
  id: string;
  type: "referral_earned" | "checkout_spent" | "admin_credit" | "admin_debit";
  amount: number; // in rupees (negative for debits)
  description: string | null;
  createdAt: string; // ISO datetime
}

export interface WalletTransactionHistory {
  transactions: WalletTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
}

export interface WalletMonthlySummary {
  month: string; // YYYY-MM format
  earned: number;
  spent: number;
  balance: number;
}

export interface CashflowAudit {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalCredits: number;
    totalDebits: number;
    creditsByType: Record<string, number>;
    debitsByType: Record<string, number>;
  };
  transactions: Array<{
    id: string;
    userId: string;
    type: string;
    amount: number;
    createdAt: string;
  }>;
}

export interface ReconciliationReport {
  period: {
    startDate: string;
    endDate: string;
  };
  walletCheckouts: {
    total: number;
    amount: number;
  };
  paymentRecords: {
    total: number;
    amount: number;
  };
  discrepancies: Array<{
    type: string;
    message: string;
    details: unknown;
  }>;
  status: "reconciled" | "discrepancy_found";
}

// ─── Public API calls ────────────────────────────────────────────────────────

/**
 * Get current wallet balance
 */
export async function getWalletBalance(token: string): Promise<WalletBalance> {
  return apiFetch("/wallet/balance", {
    token,
    method: "GET",
  });
}

/**
 * Get wallet transaction history with pagination and optional filtering
 */
export async function getWalletTransactions(
  token: string,
  page = 1,
  pageSize = 50,
  type?: string,
): Promise<WalletTransactionHistory> {
  return apiFetch("/wallet/transactions", {
    token,
    method: "GET",
    query: { page, pageSize, ...(type && { type }) },
  });
}

/**
 * Get wallet monthly summary (last N months)
 */
export async function getWalletMonthlySummary(
  token: string,
  monthsBack = 12,
): Promise<WalletMonthlySummary[]> {
  return apiFetch("/wallet/monthly-summary", {
    token,
    method: "GET",
    query: { monthsBack },
  });
}

/**
 * Get cashflow audit report (admin only)
 */
export async function getCashflowAudit(
  token: string,
  startDate: string,
  endDate: string,
): Promise<CashflowAudit> {
  return apiFetch("/wallet/admin/cashflow-audit", {
    token,
    method: "GET",
    query: { startDate, endDate },
  });
}

/**
 * Get reconciliation report (admin only)
 */
export async function getReconciliationReport(
  token: string,
  startDate: string,
  endDate: string,
): Promise<ReconciliationReport> {
  return apiFetch("/wallet/admin/reconciliation", {
    token,
    method: "GET",
    query: { startDate, endDate },
  });
}

/**
 * Safe versions for client-side usage (return fallback on error)
 */
export async function getWalletBalanceSafe(
  token: string,
  fallback: WalletBalance = { balance: 0 },
): Promise<WalletBalance> {
  return safeApiFetch("/wallet/balance", fallback, {
    token,
    method: "GET",
  });
}

export async function getWalletTransactionsSafe(
  token: string,
  page = 1,
  pageSize = 50,
  type?: string,
  fallback: WalletTransactionHistory = { transactions: [], pagination: { page, pageSize, total: 0, pages: 0 } },
): Promise<WalletTransactionHistory> {
  return safeApiFetch("/wallet/transactions", fallback, {
    token,
    method: "GET",
    query: { page, pageSize, ...(type && { type }) },
  });
}
