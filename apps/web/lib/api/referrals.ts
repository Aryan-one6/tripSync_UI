import { apiFetch, safeApiFetch } from "./client";

export interface ReferralLink {
  id: string;
  code: string;
  shareUrl: string;
  qrUrl: string;
  expiresAt: string; // ISO datetime
}

export interface ReferralUser {
  id: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string; // ISO datetime
}

export interface MyReferral {
  id: string;
  referredUser: ReferralUser;
  status: "INVITED" | "PENDING" | "COMPLETED";
  earnedAmount: number; // in rupees
  completedAt: string | null; // ISO datetime
  createdAt: string; // ISO datetime
}

export interface MyReferralsResponse {
  referrals: MyReferral[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
}

export interface ReferralStats {
  sentReferrals: number;
  sentCompleted: number;
  sentPending: number;
  totalEarned: number;
  receivedReferrals: number;
}

export interface ReferralMetrics extends ReferralStats {
  conversionRate: string; // percentage e.g. "45.50%"
  averageEarningsPerReferral: string; // e.g. "250.00"
}

// ─── Public API calls ────────────────────────────────────────────────────────

/**
 * Get stable referral link for the current user
 */
export async function getMyReferralLink(token: string): Promise<ReferralLink> {
  return apiFetch("/referrals/my-link", {
    token,
    method: "GET",
  });
}

/**
 * Backward-compatible alias.
 * Server now returns a stable personal link instead of generating a new code each call.
 */
export async function generateReferralLink(token: string): Promise<ReferralLink> {
  return apiFetch("/referrals/generate-link", {
    token,
    method: "POST",
  });
}

/**
 * Get list of referrals made by the current user
 */
export async function getMyReferrals(
  token: string,
  page = 1,
  pageSize = 20,
): Promise<MyReferralsResponse> {
  return apiFetch("/referrals/my-referrals", {
    token,
    method: "GET",
    query: { page, pageSize },
  });
}

/**
 * Get referral statistics for the current user
 */
export async function getReferralStats(token: string): Promise<ReferralStats> {
  return apiFetch("/referrals/stats", {
    token,
    method: "GET",
  });
}

/**
 * Get referral metrics including conversion rates
 */
export async function getReferralMetrics(token: string): Promise<ReferralMetrics> {
  return apiFetch("/referrals/metrics", {
    token,
    method: "GET",
  });
}

// ─── Safe versions (with fallbacks) ──────────────────────────────────────────

export async function getMyReferralsSafe(
  token: string,
  page = 1,
  pageSize = 20,
  fallback: MyReferralsResponse = {
    referrals: [],
    pagination: { page, pageSize, total: 0, pages: 0 },
  },
): Promise<MyReferralsResponse> {
  return safeApiFetch("/referrals/my-referrals", fallback, {
    token,
    method: "GET",
    query: { page, pageSize },
  });
}

export async function getMyReferralLinkSafe(
  token: string,
  fallback: ReferralLink = {
    id: "",
    code: "",
    shareUrl: "",
    qrUrl: "",
    expiresAt: "",
  },
): Promise<ReferralLink> {
  return safeApiFetch("/referrals/my-link", fallback, {
    token,
    method: "GET",
  });
}

export async function getReferralStatsSafe(
  token: string,
  fallback: ReferralStats = {
    sentReferrals: 0,
    sentCompleted: 0,
    sentPending: 0,
    totalEarned: 0,
    receivedReferrals: 0,
  },
): Promise<ReferralStats> {
  return safeApiFetch("/referrals/stats", fallback, {
    token,
    method: "GET",
  });
}

export async function getReferralMetricsSafe(
  token: string,
  fallback: ReferralMetrics = {
    sentReferrals: 0,
    sentCompleted: 0,
    sentPending: 0,
    totalEarned: 0,
    receivedReferrals: 0,
    conversionRate: "0%",
    averageEarningsPerReferral: "0",
  },
): Promise<ReferralMetrics> {
  return safeApiFetch("/referrals/metrics", fallback, {
    token,
    method: "GET",
  });
}
