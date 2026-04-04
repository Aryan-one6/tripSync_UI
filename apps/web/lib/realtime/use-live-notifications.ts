"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import type { NotificationItem } from "@/lib/api/types";
import { useSocket } from "@/lib/realtime/use-socket";

const MAX_ITEMS = 40;
export const CONVERSATION_READ_EVENT = "tripsync:conversation-read";

function defaultInboxHref(isAgency: boolean): string {
  return isAgency ? "/agency/inbox" : "/dashboard/messages";
}

export interface LiveNotificationItem extends NotificationItem {
  href: string;
}

function normalizeNotification(
  item: NotificationItem,
  isAgency: boolean,
): LiveNotificationItem {
  return {
    ...item,
    href: item.href ?? defaultInboxHref(isAgency),
    read: item.read ?? Boolean(item.readAt),
  };
}

function conversationIdFromMetadata(
  metadata?: Record<string, unknown> | null,
): string | null {
  const value = metadata?.conversationId;
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function useLiveNotifications() {
  const { session, status, apiFetchWithAuth } = useAuth();
  const socket = useSocket();
  const userId = session?.user?.id ?? null;
  const isAgency = session?.role === "agency_admin";
  const [items, setItems] = useState<LiveNotificationItem[]>([]);

  const upsertItem = useCallback((incoming: NotificationItem) => {
    setItems((current) => {
      const normalized = normalizeNotification(incoming, isAgency);
      const existingIndex = current.findIndex((item) => item.id === normalized.id);

      if (existingIndex >= 0) {
        return current.map((item) =>
          item.id === normalized.id ? normalized : item,
        );
      }
      return [normalized, ...current]
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, MAX_ITEMS);
    });
  }, [isAgency]);

  useEffect(() => {
    if (status !== "authenticated" || !userId) {
      setItems([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const inbox = await apiFetchWithAuth<NotificationItem[]>(
          `/notifications?limit=${MAX_ITEMS}`,
        );
        if (cancelled) return;
        setItems(inbox.map((item) => normalizeNotification(item, isAgency)));
      } catch {
        if (cancelled) return;
        setItems([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiFetchWithAuth, isAgency, status, userId]);

  useEffect(() => {
    if (status !== "authenticated" || !socket || !userId) return;

    const handler = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;

      const data = payload as Partial<NotificationItem>;
      if (
        typeof data.id !== "string" ||
        typeof data.type !== "string" ||
        typeof data.title !== "string" ||
        typeof data.body !== "string" ||
        typeof data.createdAt !== "string"
      ) {
        return;
      }

      upsertItem({
        id: data.id,
        type: data.type,
        title: data.title,
        body: data.body,
        href: typeof data.href === "string" ? data.href : null,
        metadata:
          data.metadata && typeof data.metadata === "object"
            ? (data.metadata as Record<string, unknown>)
            : null,
        createdAt: data.createdAt,
        readAt: typeof data.readAt === "string" ? data.readAt : null,
        read: typeof data.read === "boolean" ? data.read : Boolean(data.readAt),
      });
    };

    socket.on("notification:created", handler);
    return () => {
      socket.off("notification:created", handler);
    };
  }, [socket, status, upsertItem, userId]);

  const unreadCount = useMemo(
    () => items.reduce((count, item) => (item.read ? count : count + 1), 0),
    [items],
  );

  const markAllRead = useCallback(() => {
    const optimisticReadAt = new Date().toISOString();
    setItems((current) =>
      current.map((item) => ({ ...item, read: true, readAt: optimisticReadAt })),
    );

    void apiFetchWithAuth<{ updatedCount: number; readAt: string }>("/notifications/read-all", {
      method: "POST",
    })
      .then((result) => {
        setItems((current) =>
          current.map((item) => ({ ...item, read: true, readAt: result.readAt })),
        );
      })
      .catch(() => undefined);
  }, [apiFetchWithAuth]);

  const markRead = useCallback((id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, read: true, readAt: item.readAt ?? new Date().toISOString() } : item,
      ),
    );

    void apiFetchWithAuth<{ id: string; readAt: string | null; read: boolean }>(
      `/notifications/${encodeURIComponent(id)}/read`,
      { method: "POST" },
    )
      .then((result) => {
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, read: result.read, readAt: result.readAt } : item,
          ),
        );
      })
      .catch(() => undefined);
  }, [apiFetchWithAuth]);

  const clearDirectMessageNotificationsForConversation = useCallback(
    (conversationId: string) => {
      if (!conversationId) return;
      const idsToMarkRead: string[] = [];
      setItems((current) =>
        current.filter((item) => {
          const isTargetDirectMessage =
            item.type === "direct_message" &&
            conversationIdFromMetadata(item.metadata) === conversationId;
          if (isTargetDirectMessage) {
            idsToMarkRead.push(item.id);
            return false;
          }
          return true;
        }),
      );

      if (idsToMarkRead.length === 0) return;
      for (const notificationId of idsToMarkRead) {
        void apiFetchWithAuth<{ id: string; readAt: string | null; read: boolean }>(
          `/notifications/${encodeURIComponent(notificationId)}/read`,
          { method: "POST" },
        ).catch(() => undefined);
      }
    },
    [apiFetchWithAuth],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ conversationId?: string }>;
      const conversationId = customEvent.detail?.conversationId;
      if (typeof conversationId !== "string") return;
      clearDirectMessageNotificationsForConversation(conversationId);
    };

    window.addEventListener(CONVERSATION_READ_EVENT, handler);
    return () => {
      window.removeEventListener(CONVERSATION_READ_EVENT, handler);
    };
  }, [clearDirectMessageNotificationsForConversation]);

  return {
    notifications: items,
    unreadCount,
    markAllRead,
    markRead,
    clearDirectMessageNotificationsForConversation,
  };
}
