"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const refreshUnreadDirectCount = useCallback(async () => {
    if (status !== "authenticated" || !userId) {
      setCount(0);
      return;
    }

    try {
      const conversations = await apiFetchWithAuth<DirectConversation[]>(
        "/chat/direct/conversations",
      );
      setCount(sumUnread(conversations));
    } catch {
      setCount(0);
    }
  }, [apiFetchWithAuth, status, userId]);

  useEffect(() => {
    void refreshUnreadDirectCount();
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

