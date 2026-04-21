"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useSocket } from "@/lib/realtime/use-socket";

export type ReferralInviteEvent = {
  referralId: string;
  referrerId: string;
  referredUserId: string;
  referredEmail?: string | null;
  status: "INVITED" | "PENDING" | "COMPLETED";
  timestamp: string;
};

export type ReferralStatusEvent = {
  referralId: string;
  referrerId: string;
  referredUserId: string;
  status: "INVITED" | "PENDING" | "COMPLETED";
  referrerBonusRupees?: number;
  referredBonusRupees?: number;
  timestamp: string;
};

export function useReferralUpdates(options: {
  enabled?: boolean;
  onNewInvite?: (payload: ReferralInviteEvent) => void;
  onStatusChanged?: (payload: ReferralStatusEvent) => void;
} = {}) {
  const { enabled = true, onNewInvite, onStatusChanged } = options;
  const { status } = useAuth();
  const socket = useSocket();
  const [lastInvite, setLastInvite] = useState<ReferralInviteEvent | null>(null);
  const [lastStatusChange, setLastStatusChange] = useState<ReferralStatusEvent | null>(null);

  useEffect(() => {
    if (!enabled || status !== "authenticated" || !socket) return;

    const handleNewInvite = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const data = payload as Partial<ReferralInviteEvent>;
      if (
        typeof data.referralId !== "string" ||
        typeof data.referrerId !== "string" ||
        typeof data.referredUserId !== "string" ||
        typeof data.status !== "string" ||
        typeof data.timestamp !== "string"
      ) {
        return;
      }

      const event: ReferralInviteEvent = {
        referralId: data.referralId,
        referrerId: data.referrerId,
        referredUserId: data.referredUserId,
        referredEmail: typeof data.referredEmail === "string" ? data.referredEmail : null,
        status: data.status as ReferralInviteEvent["status"],
        timestamp: data.timestamp,
      };

      setLastInvite(event);
      onNewInvite?.(event);
    };

    const handleStatusChanged = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const data = payload as Partial<ReferralStatusEvent>;
      if (
        typeof data.referralId !== "string" ||
        typeof data.referrerId !== "string" ||
        typeof data.referredUserId !== "string" ||
        typeof data.status !== "string" ||
        typeof data.timestamp !== "string"
      ) {
        return;
      }

      const event: ReferralStatusEvent = {
        referralId: data.referralId,
        referrerId: data.referrerId,
        referredUserId: data.referredUserId,
        status: data.status as ReferralStatusEvent["status"],
        referrerBonusRupees:
          typeof data.referrerBonusRupees === "number" ? data.referrerBonusRupees : undefined,
        referredBonusRupees:
          typeof data.referredBonusRupees === "number" ? data.referredBonusRupees : undefined,
        timestamp: data.timestamp,
      };

      setLastStatusChange(event);
      onStatusChanged?.(event);
    };

    socket.on("referral:new-invite", handleNewInvite);
    socket.on("referral:status-changed", handleStatusChanged);

    return () => {
      socket.off("referral:new-invite", handleNewInvite);
      socket.off("referral:status-changed", handleStatusChanged);
    };
  }, [enabled, onNewInvite, onStatusChanged, socket, status]);

  return useMemo(
    () => ({
      lastInvite,
      lastStatusChange,
    }),
    [lastInvite, lastStatusChange],
  );
}
