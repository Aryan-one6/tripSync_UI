"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import type { DirectConversation } from "@/lib/api/types";
import { useSocket } from "@/lib/realtime/use-socket";
import { CONVERSATION_READ_EVENT } from "@/lib/realtime/use-live-notifications";

function sumUnread(conversations: DirectConversation[]) {
  return conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);
}

export function useUnreadDirectCount() {
  const { session, status, apiFetchWithAuth } = useAuth();
  const socket = useSocket();
  const userId = session?.user?.id ?? null;
  const [count, setCount] = useState(0);
  const refreshInFlightRef = useRef(false);
  const lastRefreshAtRef = useRef(0);

  const refreshUnreadDirectCount = useCallback(async (force = false) => {
    if (status !== "authenticated" || !userId) {
      setCount(0);
      return;
    }

    const now = Date.now();
    if (!force) {
      if (refreshInFlightRef.current) return;
      if (now - lastRefreshAtRef.current < 1_500) return;
    }

    refreshInFlightRef.current = true;
    try {
      const conversations = await apiFetchWithAuth<DirectConversation[]>(
        "/chat/direct/conversations",
        { timeoutMs: 5_000 },
      );
      setCount(sumUnread(conversations));
    } catch {
      setCount(0);
    } finally {
      refreshInFlightRef.current = false;
      lastRefreshAtRef.current = Date.now();
    }
  }, [apiFetchWithAuth, status, userId]);

  useEffect(() => {
    void refreshUnreadDirectCount(true);
  }, [refreshUnreadDirectCount]);

  useEffect(() => {
    if (status !== "authenticated" || !socket || !userId) return;

    const refresh = () => {
      void refreshUnreadDirectCount();
    };

    socket.on("direct:message_created", refresh);
    return () => {
      socket.off("direct:message_created", refresh);
    };
  }, [refreshUnreadDirectCount, socket, status, userId]);

  useEffect(() => {
    const refresh = () => {
      void refreshUnreadDirectCount();
    };

    window.addEventListener("focus", refresh);
    window.addEventListener(CONVERSATION_READ_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(CONVERSATION_READ_EVENT, refresh);
    };
  }, [refreshUnreadDirectCount]);

  return useMemo(
    () => ({
      unreadDirectCount: count,
      refreshUnreadDirectCount,
    }),
    [count, refreshUnreadDirectCount],
  );
}
