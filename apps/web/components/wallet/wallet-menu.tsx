"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Wallet, ChevronRight, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { getWalletTransactionsSafe } from "@/lib/api/wallet";
import type { WalletTransaction } from "@/lib/api/wallet";
import { useWalletBalance } from "@/lib/realtime/use-wallet-balance";
import { cn } from "@/lib/utils";

export function WalletMenu() {
  const { session } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransaction[]>([]);
  const { balance: currentBalance, isLoading: isBalanceLoading } = useWalletBalance();
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const token = session?.accessToken || "";

  // Load recent transactions when menu opens
  useEffect(() => {
    if (!token || !isOpen) return;

    const loadTransactions = async () => {
      setIsTransactionsLoading(true);
      try {
        const data = await getWalletTransactionsSafe(token, 1, 5);
        setRecentTransactions(data.transactions);
      } catch (error) {
        console.error("[wallet-menu] failed to load transactions:", error);
      } finally {
        setIsTransactionsLoading(false);
      }
    };

    loadTransactions();
  }, [isOpen, token]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [isOpen]);

  const displayBalance = currentBalance ?? 0;
  const balanceDisplay = `₹${displayBalance.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
        aria-label="Wallet"
      >
        <Wallet className="size-4 text-[var(--color-sea-600)]" />
        <span className="hidden sm:inline">{balanceDisplay}</span>
        <span className="sm:hidden">{displayBalance > 0 ? "₹" + displayBalance : "₹0"}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-lg)] animate-scale-in">
          {/* Header */}
          <div className="border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--color-ink-600)]">Wallet Balance</p>
                <p className="mt-1 text-lg font-bold text-[var(--color-ink-950)]">{balanceDisplay}</p>
              </div>
              <TrendingUp className="size-5 text-[var(--color-sea-600)]" />
            </div>
          </div>

          {/* Content */}
          <div className="p-3">
            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <Link
                href="/dashboard/wallet"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-xs font-medium text-[var(--color-sea-700)] transition hover:bg-[var(--color-sea-50)]"
              >
                <Wallet className="size-3.5" />
                Wallet
              </Link>
              <Link
                href="/dashboard/refer-and-earn"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-xs font-medium text-[var(--color-sea-700)] transition hover:bg-[var(--color-sea-50)]"
              >
                <TrendingUp className="size-3.5" />
                Refer
              </Link>
            </div>

            {/* Recent transactions */}
            <div className="border-t border-[var(--color-border)] pt-3">
              <p className="mb-2 text-xs font-semibold text-[var(--color-ink-600)]">Recent Activity</p>
              {isBalanceLoading || isTransactionsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
                  ))}
                </div>
              ) : recentTransactions.length === 0 ? (
                <p className="text-center py-3 text-xs text-[var(--color-ink-400)]">No transactions yet</p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg bg-[var(--color-surface-1)] px-2 py-2 text-xs"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-[var(--color-ink-900)]">
                          {tx.type === "referral_earned" && "Referral earned"}
                          {tx.type === "checkout_spent" && "Used at checkout"}
                          {tx.type === "admin_credit" && "Admin credit"}
                          {tx.type === "admin_debit" && "Admin debit"}
                        </p>
                        <p className="text-[10px] text-[var(--color-ink-500)]">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <p
                        className={cn(
                          "font-semibold",
                          tx.amount > 0
                            ? "text-[var(--color-success-600)]"
                            : "text-[var(--color-sunset-600)]",
                        )}
                      >
                        {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString("en-IN")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* View all link */}
            <Link
              href="/dashboard/wallet"
              onClick={() => setIsOpen(false)}
              className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-sea-50)] py-2 text-xs font-semibold text-[var(--color-sea-700)] transition hover:bg-[var(--color-sea-100)]"
            >
              View All Transactions
              <ChevronRight className="size-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
