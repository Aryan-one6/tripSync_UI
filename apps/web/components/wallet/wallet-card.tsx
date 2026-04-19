"use client";

import Link from "next/link";
import { TrendingUp, ChevronRight } from "lucide-react";
import { useWalletBalance } from "@/lib/realtime/use-wallet-balance";

export function WalletCard() {
  const { balance, isLoading } = useWalletBalance();

  const displayBalance = balance ?? 0;
  const maxWallet = 10000; // Max wallet value for progress bar
  const progressPercent = Math.min((displayBalance / maxWallet) * 100, 100);

  return (
    <Link
      href="/dashboard/wallet"
      className="group relative block w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-sea-50)] to-white p-4 transition hover:border-[var(--color-sea-200)] hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-[var(--color-ink-600)]">Wallet Balance</p>
          {isLoading ? (
            <div className="mt-2 h-8 w-32 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-[var(--color-ink-950)]">
              ₹{displayBalance.toLocaleString("en-IN", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          )}
        </div>
        <TrendingUp className="size-5 text-[var(--color-sea-600)]" />
      </div>

      {/* Progress bar */}
      {displayBalance > 0 && (
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-[var(--color-surface-2)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-sea-500)] to-[var(--color-sea-600)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--color-ink-500)]">
            {((displayBalance / maxWallet) * 100).toFixed(0)}% of max wallet
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
        <p className="text-xs font-medium text-[var(--color-sea-700)]">View Wallet</p>
        <ChevronRight className="size-3.5 text-[var(--color-sea-600)] transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
