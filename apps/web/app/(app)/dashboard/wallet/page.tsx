"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Filter,
  Gift,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getWalletTransactionsSafe,
  type WalletTransactionHistory,
} from "@/lib/api/wallet";
import {
  getMyReferralLinkSafe,
  getReferralStatsSafe,
  type ReferralLink,
  type ReferralStats,
} from "@/lib/api/referrals";
import { useWalletBalance } from "@/lib/realtime/use-wallet-balance";
import { cn } from "@/lib/utils";

export default function WalletPage() {
  const { session } = useAuth();
  const token = session?.accessToken ?? "";

  const { balance: liveBalance, isLoading: isBalanceLoading, refreshBalance } = useWalletBalance();

  const [transactions, setTransactions] = useState<WalletTransactionHistory | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [inviteLink, setInviteLink] = useState<ReferralLink | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);

  const pageSize = 20;

  const loadTransactions = useCallback(async () => {
    if (!token) {
      setIsLoadingTransactions(false);
      return;
    }

    setIsLoadingTransactions(true);
    try {
      const txData = await getWalletTransactionsSafe(token, currentPage, pageSize, activeFilter);
      setTransactions(txData);
    } catch (error) {
      console.error("[wallet-page] failed to load transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [token, currentPage, activeFilter]);

  const loadWalletMeta = useCallback(async () => {
    if (!token) return;

    try {
      const [stats, link] = await Promise.all([
        getReferralStatsSafe(token),
        getMyReferralLinkSafe(token),
      ]);
      setReferralStats(stats);
      if (link.id) {
        setInviteLink(link);
      }
    } catch (error) {
      console.error("[wallet-page] failed to load referral meta:", error);
    }
  }, [token]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    void loadWalletMeta();
  }, [loadWalletMeta]);

  const handleRefresh = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        getWalletTransactionsSafe(token, 1, pageSize, activeFilter).then(setTransactions),
        refreshBalance(),
        loadWalletMeta(),
      ]);
      setCurrentPage(1);
    } catch (error) {
      console.error("[wallet-page] refresh failed:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLink?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(inviteLink.shareUrl);
    } catch (error) {
      console.error("[wallet-page] unable to copy referral link:", error);
    }
  };

  const filters = [
    { key: undefined, label: "All" },
    { key: "referral_earned", label: "Referral Earned" },
    { key: "checkout_spent", label: "Used at Checkout" },
    { key: "admin_credit", label: "Admin Credit" },
    { key: "admin_debit", label: "Admin Debit" },
  ];

  const displayBalance = liveBalance ?? 0;

  const { totalEarned, totalSpent } = useMemo(() => {
    const list = transactions?.transactions ?? [];
    const earned = list.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const spent = Math.abs(list.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0));
    return { totalEarned: earned, totalSpent: spent };
  }, [transactions]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "referral_earned":
      case "admin_credit":
        return <TrendingUp className="size-4 text-[var(--color-success-600)]" />;
      case "checkout_spent":
      case "admin_debit":
        return <TrendingDown className="size-4 text-[var(--color-sunset-600)]" />;
      default:
        return <Wallet className="size-4 text-[var(--color-ink-500)]" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "referral_earned":
        return "Referral earned";
      case "checkout_spent":
        return "Used at checkout";
      case "admin_credit":
        return "Admin credit";
      case "admin_debit":
        return "Admin debit";
      default:
        return type;
    }
  };

  if (isBalanceLoading && isLoadingTransactions) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--color-sea-600)]" />
      </div>
    );
  }

  return (
    <DashboardShell
      variant="user"
      title="Wallet"
      subtitle="Track your referral earnings, wallet balance, and all deductions from one place."
      actions={
        <Button type="button" variant="secondary" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
              <p className="text-xs font-semibold text-[var(--color-ink-600)]">Current Balance</p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-ink-950)]">
                ₹{displayBalance.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
              <p className="text-xs font-semibold text-[var(--color-ink-600)]">Total Earned</p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-success-600)]">
                +₹{totalEarned.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
              <p className="text-xs font-semibold text-[var(--color-ink-600)]">Total Spent</p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-sunset-600)]">
                -₹{totalSpent.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Referral wallet
              </p>
              <h2 className="mt-1 font-display text-lg text-[var(--color-ink-950)]">Invite & Earn</h2>
            </div>
            <Gift className="size-5 text-[var(--color-sea-600)]" />
          </div>

          <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
            <p className="text-xs text-[var(--color-ink-600)]">Your code</p>
            <p className="mt-1 font-display text-2xl tracking-wide text-[var(--color-ink-950)]">
              {inviteLink?.code || session?.user.referralCode || "------"}
            </p>
            <p className="mt-2 break-all text-xs text-[var(--color-ink-500)]">
              {inviteLink?.shareUrl || "Share link will appear here shortly."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleCopyInviteLink} disabled={!inviteLink?.shareUrl}>
                <Copy className="size-4" />
                Copy link
              </Button>
              {inviteLink?.shareUrl ? (
                <a
                  href={inviteLink.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)]"
                >
                  <ExternalLink className="size-3.5" />
                  Open
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Sent</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-ink-950)]">
                {referralStats?.sentReferrals ?? 0}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Completed</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-ink-950)]">
                {referralStats?.sentCompleted ?? 0}
              </p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Earned</p>
              <p className="mt-1 text-lg font-semibold text-[var(--color-sea-700)]">
                ₹{(referralStats?.totalEarned ?? 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--color-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-ink-950)]">Transaction History</h2>
            <p className="mt-1 text-xs text-[var(--color-ink-600)]">
              {transactions?.pagination.total ?? 0} transactions
            </p>
          </div>
        </div>

        <div className="border-b border-[var(--color-border)] px-5 py-3 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="size-4 shrink-0 text-[var(--color-ink-500)]" />
            {filters.map((filter) => (
              <button
                key={filter.key ?? "all"}
                onClick={() => {
                  setActiveFilter(filter.key);
                  setCurrentPage(1);
                }}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
                  activeFilter === filter.key
                    ? "bg-[var(--color-sea-600)] text-white"
                    : "border border-[var(--color-border)] text-[var(--color-ink-600)] hover:bg-[var(--color-surface-2)]"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {isLoadingTransactions ? (
          <div className="flex items-center justify-center px-6 py-16">
            <Loader2 className="size-5 animate-spin text-[var(--color-sea-600)]" />
          </div>
        ) : !transactions?.transactions?.length ? (
          <div className="px-6 py-14 text-center">
            <Wallet className="mx-auto size-12 text-[var(--color-ink-300)]" />
            <p className="mt-4 text-sm text-[var(--color-ink-600)]">
              {activeFilter ? "No transactions found for this filter" : "No transactions yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {transactions.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)]">
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                      {getTransactionLabel(tx.type)}
                    </p>
                    <p className="text-xs text-[var(--color-ink-500)]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                    {tx.description ? (
                      <p className="mt-0.5 truncate text-xs text-[var(--color-ink-500)]">{tx.description}</p>
                    ) : null}
                  </div>
                </div>
                <Badge variant="outline" className={cn(tx.amount > 0 ? "text-[var(--color-success-700)]" : "text-[var(--color-sunset-700)]")}>
                  {tx.amount > 0 ? "+" : "-"}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {transactions && transactions.pagination.pages > 1 ? (
          <div className="flex items-center justify-center gap-2 border-t border-[var(--color-border)] px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs font-medium text-[var(--color-ink-600)]">
              Page {currentPage} of {transactions.pagination.pages}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(transactions.pagination.pages, p + 1))}
              disabled={currentPage === transactions.pagination.pages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </Card>
    </DashboardShell>
  );
}
