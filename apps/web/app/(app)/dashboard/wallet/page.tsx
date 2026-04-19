"use client";

import { useState, useEffect } from "react";
import {
  Download,
  Wallet,
  TrendingDown,
  TrendingUp,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getWalletTransactionsSafe } from "@/lib/api/wallet";
import { Button } from "@/components/ui/button";
import type { WalletTransactionHistory } from "@/lib/api/wallet";
import { cn } from "@/lib/utils";
import { useWalletBalance } from "@/lib/realtime/use-wallet-balance";

export default function WalletPage() {
  const { session } = useAuth();
  const { balance: liveBalance, isLoading: isBalanceLoading, refreshBalance } = useWalletBalance();
  const [transactions, setTransactions] = useState<WalletTransactionHistory | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const token = session?.accessToken || "";
  const pageSize = 20;

  // Load transactions
  useEffect(() => {
    if (!token) {
      setIsLoadingTransactions(false);
      return;
    }

    const loadData = async () => {
      setIsLoadingTransactions(true);
      try {
        const txData = await getWalletTransactionsSafe(token, currentPage, pageSize, activeFilter);
        setTransactions(txData);
      } catch (error) {
        console.error("[wallet-page] failed to load data:", error);
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    loadData();
  }, [token, currentPage, activeFilter]);

  const handleRefresh = async () => {
    if (!token) return;
    setIsRefreshing(true);
    try {
      const txData = await getWalletTransactionsSafe(token, 1, pageSize, activeFilter);
      await refreshBalance();
      setTransactions(txData);
      setCurrentPage(1);
    } catch (error) {
      console.error("[wallet-page] refresh failed:", error);
    } finally {
      setIsRefreshing(false);
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
  const totalEarned = transactions?.transactions
    .filter((tx) => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0) ?? 0;
  const totalSpent = Math.abs(
    transactions?.transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0) ?? 0
  );

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

  if (isLoadingTransactions || isBalanceLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[var(--color-sea-600)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-ink-950)]">Wallet</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-600)]">
          Manage your wallet balance and view transaction history
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Current balance */}
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--color-ink-600)]">Current Balance</p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-ink-950)]">
                ₹{displayBalance.toLocaleString("en-IN")}
              </p>
            </div>
            <Wallet className="size-6 text-[var(--color-sea-600)]" />
          </div>
        </div>

        {/* Total earned */}
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--color-ink-600)]">Total Earned</p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-success-600)]">
                +₹{totalEarned.toLocaleString("en-IN")}
              </p>
            </div>
            <TrendingUp className="size-6 text-[var(--color-success-600)]" />
          </div>
        </div>

        {/* Total spent */}
        <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--color-ink-600)]">Total Spent</p>
              <p className="mt-2 text-2xl font-bold text-[var(--color-sunset-600)]">
                -₹{totalSpent.toLocaleString("en-IN")}
              </p>
            </div>
            <TrendingDown className="size-6 text-[var(--color-sunset-600)]" />
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="rounded-lg border border-[var(--color-border)] bg-white">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-ink-950)]">Transaction History</h2>
            <p className="mt-1 text-xs text-[var(--color-ink-600)]">
              {transactions?.pagination.total ?? 0} transactions
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="self-start sm:self-auto"
          >
            {isRefreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="border-b border-[var(--color-border)] px-6 py-3">
          <div className="flex flex-wrap gap-2">
            <Filter className="size-4 text-[var(--color-ink-500)]" />
            {filters.map((filter) => (
              <button
                key={filter.key ?? "all"}
                onClick={() => {
                  setActiveFilter(filter.key);
                  setCurrentPage(1);
                }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
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

        {/* Transactions list */}
        <div className="divide-y divide-[var(--color-border)]">
          {!transactions?.transactions || transactions.transactions.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Wallet className="mx-auto size-12 text-[var(--color-ink-300)]" />
              <p className="mt-4 text-sm text-[var(--color-ink-600)]">
                {activeFilter ? "No transactions found for this filter" : "No transactions yet"}
              </p>
            </div>
          ) : (
            transactions.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-surface-1)] transition">
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--color-surface-2)]">
                    {getTransactionIcon(tx.type)}
                  </div>
                  <div>
                    <p className="font-medium text-[var(--color-ink-900)]">
                      {getTransactionLabel(tx.type)}
                    </p>
                    <p className="text-xs text-[var(--color-ink-500)]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p
                  className={cn(
                    "font-semibold",
                    tx.amount > 0
                      ? "text-[var(--color-success-600)]"
                      : "text-[var(--color-sunset-600)]"
                  )}
                >
                  {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {transactions && transactions.pagination.pages > 1 && (
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
        )}
      </div>
    </div>
  );
}
