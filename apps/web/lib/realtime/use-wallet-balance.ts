"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { getWalletBalanceSafe } from "@/lib/api/wallet";
import { useSocket } from "@/lib/realtime/use-socket";

type WalletBalanceEvent = {
  userId?: string;
  balance?: number;
  delta?: number;
  reason?: string;
  relatedPaymentId?: string | null;
  relatedReferralId?: string | null;
  timestamp?: string;
};

export function useWalletBalance(options: {
  enabled?: boolean;
  initialBalance?: number;
  onBalanceChange?: (nextBalance: number, event?: WalletBalanceEvent) => void;
} = {}) {
  const { enabled = true, initialBalance = 0, onBalanceChange } = options;
  const { session, status } = useAuth();
  const socket = useSocket();
  const token = session?.accessToken ?? "";
  const userId = session?.user?.id ?? null;
  const [balance, setBalance] = useState<number>(initialBalance);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!enabled || status !== "authenticated" || !token) {
      setIsLoading(false);
      setBalance(initialBalance);
      return;
    }

    setIsLoading(true);
    const data = await getWalletBalanceSafe(token, { balance: initialBalance });
    setBalance(data.balance ?? 0);
    setLastUpdatedAt(new Date().toISOString());
    onBalanceChange?.(data.balance ?? 0);
    setIsLoading(false);
  }, [enabled, initialBalance, onBalanceChange, status, token]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  useEffect(() => {
    if (!enabled || status !== "authenticated" || !socket || !userId) return;

    const handleBalanceUpdated = (payload: unknown) => {
      if (!payload || typeof payload !== "object") {
        void refreshBalance();
        return;
      }

      const event = payload as WalletBalanceEvent;
      if (event.userId && event.userId !== userId) {
        return;
      }

      if (typeof event.balance === "number" && Number.isFinite(event.balance)) {
        setBalance(event.balance);
        setLastUpdatedAt(event.timestamp ?? new Date().toISOString());
        onBalanceChange?.(event.balance, event);
        return;
      }

      void refreshBalance();
    };

    socket.on("wallet:balance-updated", handleBalanceUpdated);
    return () => {
      socket.off("wallet:balance-updated", handleBalanceUpdated);
    };
  }, [enabled, onBalanceChange, refreshBalance, socket, status, userId]);

  return useMemo(
    () => ({
      balance,
      isLoading,
      lastUpdatedAt,
      refreshBalance,
    }),
    [balance, isLoading, lastUpdatedAt, refreshBalance],
  );
}
