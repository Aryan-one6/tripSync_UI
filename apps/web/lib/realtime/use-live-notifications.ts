"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useSocket } from "@/lib/realtime/use-socket";

const STORAGE_PREFIX = "travellersin.live-notifications";
const MAX_ITEMS = 40;

export interface LiveNotificationItem {
  id: string;
  dedupeKey: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  read: boolean;
}

function storageKeyFor(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function defaultInboxHref(isAgency: boolean) {
  return isAgency ? "/agency/inbox" : "/dashboard/messages";
}

function defaultBidsHref(isAgency: boolean) {
  return isAgency ? "/agency/bids" : "/dashboard/messages";
}

function makeNotification(event: string, payload: unknown, isAgency: boolean) {
  const safePayload = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const createdAt = new Date().toISOString();
  const action = typeof safePayload.action === "string" ? safePayload.action.toLowerCase() : null;
  const status = typeof safePayload.status === "string" ? safePayload.status.toLowerCase() : null;
  const actionOrStatus = action ?? status;

  if (event === "offer:created") {
    const offerId = typeof safePayload.offerId === "string" ? safePayload.offerId : "new";
    return {
      dedupeKey: `offer-created:${offerId}`,
      title: "New offer submitted",
      body: "A fresh offer is now live in your negotiation flow.",
      href: defaultBidsHref(isAgency),
      createdAt,
    };
  }

  if (event === "offer:countered") {
    const offerId = typeof safePayload.offerId === "string" ? safePayload.offerId : "counter";
    const round = typeof safePayload.round === "number" ? `Round ${safePayload.round}` : "New round";
    return {
      dedupeKey: `offer-countered:${offerId}:${round}`,
      title: "Counter offer update",
      body: `${round} is ready for your response.`,
      href: defaultBidsHref(isAgency),
      createdAt,
    };
  }

  if (event === "offer:updated") {
    const offerId = typeof safePayload.offerId === "string" ? safePayload.offerId : "updated";
    if (actionOrStatus === "accepted") {
      return {
        dedupeKey: `offer-updated:${offerId}:accepted`,
        title: "Offer accepted",
        body: "This offer has been accepted and moved to the confirmed flow.",
        href: defaultBidsHref(isAgency),
        createdAt,
      };
    }
    if (actionOrStatus === "withdrawn") {
      return {
        dedupeKey: `offer-updated:${offerId}:withdrawn`,
        title: "Offer withdrawn",
        body: "The live offer was withdrawn.",
        href: defaultBidsHref(isAgency),
        createdAt,
      };
    }
    if (actionOrStatus === "rejected") {
      return {
        dedupeKey: `offer-updated:${offerId}:rejected`,
        title: "Offer declined",
        body: "This offer was declined.",
        href: defaultBidsHref(isAgency),
        createdAt,
      };
    }
    return {
      dedupeKey: `offer-updated:${offerId}:${actionOrStatus ?? "updated"}`,
      title: "Offer status changed",
      body: "Offer terms were updated.",
      href: defaultBidsHref(isAgency),
      createdAt,
    };
  }

  if (event === "offer:accepted") {
    const offerId = typeof safePayload.offerId === "string" ? safePayload.offerId : "accepted";
    return {
      dedupeKey: `offer-accepted:${offerId}`,
      title: "Offer accepted",
      body: "This offer has been accepted and moved to the confirmed flow.",
      href: defaultBidsHref(isAgency),
      createdAt,
    };
  }

  if (event === "offer:rejected") {
    const offerId = typeof safePayload.offerId === "string" ? safePayload.offerId : "rejected";
    return {
      dedupeKey: `offer-rejected:${offerId}`,
      title: "Offer declined",
      body: "An offer in your thread was declined.",
      href: defaultBidsHref(isAgency),
      createdAt,
    };
  }

  if (event === "direct:message_created") {
    const conversationId =
      typeof safePayload.conversationId === "string" ? safePayload.conversationId : null;
    const messagePayload =
      safePayload.message && typeof safePayload.message === "object"
        ? (safePayload.message as Record<string, unknown>)
        : null;
    const sender =
      messagePayload?.sender && typeof messagePayload.sender === "object"
        ? (messagePayload.sender as Record<string, unknown>)
        : null;
    const senderName =
      typeof sender?.fullName === "string" && sender.fullName.trim().length > 0
        ? sender.fullName
        : "Someone";
    const content =
      typeof messagePayload?.content === "string" && messagePayload.content.trim().length > 0
        ? messagePayload.content
        : "New message";
    return {
      dedupeKey: `direct-message:${typeof messagePayload?.id === "string" ? messagePayload.id : createdAt}`,
      title: `${senderName} sent a message`,
      body: content.slice(0, 140),
      href: `${defaultInboxHref(isAgency)}${conversationId ? `?conversationId=${conversationId}` : ""}`,
      createdAt,
    };
  }

  if (event === "chat:message_created") {
    const groupId = typeof safePayload.groupId === "string" ? safePayload.groupId : null;
    const content =
      typeof safePayload.content === "string" && safePayload.content.trim().length > 0
        ? safePayload.content
        : "New group chat message";
    return {
      dedupeKey: `group-message:${typeof safePayload.id === "string" ? safePayload.id : createdAt}`,
      title: "Trip chat update",
      body: content.slice(0, 140),
      href: groupId
        ? isAgency
          ? `/agency/groups/${groupId}/chat`
          : `/dashboard/groups/${groupId}/chat`
        : defaultInboxHref(isAgency),
      createdAt,
    };
  }

  if (event === "payment:captured") {
    const paymentId = typeof safePayload.paymentId === "string" ? safePayload.paymentId : "captured";
    const groupId = typeof safePayload.groupId === "string" ? safePayload.groupId : null;
    return {
      dedupeKey: `payment-captured:${paymentId}`,
      title: "Payment captured",
      body: "A traveler payment was captured successfully.",
      href: groupId
        ? isAgency
          ? `/agency/groups/${groupId}/chat`
          : `/dashboard/groups/${groupId}/checkout`
        : defaultInboxHref(isAgency),
      createdAt,
    };
  }

  if (event === "payment:plan_confirmed") {
    const planId = typeof safePayload.planId === "string" ? safePayload.planId : "confirmed";
    const groupId = typeof safePayload.groupId === "string" ? safePayload.groupId : null;
    return {
      dedupeKey: `plan-confirmed:${planId}`,
      title: "Trip confirmed",
      body: "All required payments are complete. Trip is confirmed.",
      href: groupId
        ? isAgency
          ? `/agency/groups/${groupId}/chat`
          : `/dashboard/groups/${groupId}/chat`
        : defaultInboxHref(isAgency),
      createdAt,
    };
  }

  if (event === "review:created") {
    const reviewId = typeof safePayload.reviewId === "string" ? safePayload.reviewId : "review";
    return {
      dedupeKey: `review-created:${reviewId}`,
      title: "New review received",
      body: "A new review has been posted.",
      href: isAgency ? "/agency/storefront" : "/dashboard/trips",
      createdAt,
    };
  }

  if (event === "group:member_updated") {
    const action = typeof safePayload.action === "string" ? safePayload.action : "updated";
    const groupId = typeof safePayload.groupId === "string" ? safePayload.groupId : null;
    return {
      dedupeKey: `group-member:${groupId ?? "unknown"}:${action}:${typeof safePayload.userId === "string" ? safePayload.userId : "user"}`,
      title: "Group membership changed",
      body: `A traveler was ${action} in your trip group.`,
      href: groupId
        ? isAgency
          ? `/agency/groups/${groupId}/chat`
          : "/dashboard/trips"
        : "/dashboard/trips",
      createdAt,
    };
  }

  return null;
}

export function useLiveNotifications() {
  const { session } = useAuth();
  const socket = useSocket();
  const userId = session?.user?.id ?? null;
  const isAgency = session?.role === "agency_admin";
  const [items, setItems] = useState<LiveNotificationItem[]>([]);

  const pushItem = useCallback((next: Omit<LiveNotificationItem, "id" | "read">) => {
    setItems((current) => {
      const existing = current.find((item) => item.dedupeKey === next.dedupeKey);
      if (existing) {
        return current.map((item) =>
          item.dedupeKey === next.dedupeKey
            ? {
                ...item,
                title: next.title,
                body: next.body,
                href: next.href,
                createdAt: next.createdAt,
                read: false,
              }
            : item,
        );
      }

      const item: LiveNotificationItem = {
        id: `${next.dedupeKey}:${Date.now()}`,
        dedupeKey: next.dedupeKey,
        title: next.title,
        body: next.body,
        href: next.href,
        createdAt: next.createdAt,
        read: false,
      };

      return [item, ...current].slice(0, MAX_ITEMS);
    });
  }, []);

  useEffect(() => {
    if (!userId || typeof window === "undefined") {
      setItems([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKeyFor(userId));
      if (!raw) {
        setItems([]);
        return;
      }
      const parsed = JSON.parse(raw) as LiveNotificationItem[];
      setItems(Array.isArray(parsed) ? parsed.slice(0, MAX_ITEMS) : []);
    } catch {
      setItems([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    window.localStorage.setItem(storageKeyFor(userId), JSON.stringify(items.slice(0, MAX_ITEMS)));
  }, [items, userId]);

  useEffect(() => {
    if (!socket || !userId) return;

    const events = [
      "offer:created",
      "offer:countered",
      "offer:updated",
      "offer:accepted",
      "offer:rejected",
      "direct:message_created",
      "chat:message_created",
      "payment:captured",
      "payment:plan_confirmed",
      "review:created",
      "group:member_updated",
    ] as const;

    const handlers = events.map((eventName) => {
      const handler = (payload: unknown) => {
        if (eventName === "direct:message_created") {
          const safePayload =
            payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
          const message =
            safePayload.message && typeof safePayload.message === "object"
              ? (safePayload.message as Record<string, unknown>)
              : null;
          if (typeof message?.senderId === "string" && message.senderId === userId) {
            return;
          }
        }

        if (eventName === "chat:message_created") {
          const safePayload =
            payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
          if (typeof safePayload.senderId === "string" && safePayload.senderId === userId) return;
        }

        const built = makeNotification(eventName, payload, isAgency);
        if (!built) return;
        pushItem(built);
      };

      socket.on(eventName, handler);
      return { eventName, handler };
    });

    return () => {
      for (const entry of handlers) {
        socket.off(entry.eventName, entry.handler);
      }
    };
  }, [isAgency, pushItem, socket, userId]);

  const unreadCount = useMemo(
    () => items.reduce((count, item) => (item.read ? count : count + 1), 0),
    [items],
  );

  const markAllRead = useCallback(() => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
  }, []);

  return {
    notifications: items,
    unreadCount,
    markAllRead,
    markRead,
  };
}
