"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  ChevronRight,
  Gavel,
  MapPin,
  MessageSquarePlus,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import {
  CounterOfferSheet,
  type CounterOfferPayload,
} from "@/components/chat/counter-offer-sheet";
import { useAuth } from "@/lib/auth/auth-context";
import { useSocket } from "@/lib/realtime/use-socket";
import { formatCurrency, formatDateRange, initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  DirectConversation,
  DirectMessage,
  Offer,
  TripMembership,
  UserSummary,
} from "@/lib/api/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function upsertDirectMessage(list: DirectMessage[], next: DirectMessage) {
  const idx = list.findIndex((m) => m.id === next.id);
  if (idx === -1)
    return [...list, next].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const clone = [...list];
  clone[idx] = next;
  return clone;
}

function sortByUpdatedAtDesc(list: DirectConversation[]) {
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function chatTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd/MM/yy");
}

function previewText(content?: string | null) {
  if (!content) return "No messages yet";
  return content.length > 55 ? `${content.slice(0, 52)}…` : content;
}

function agencyCanCounter(offer: Offer) {
  if (offer.status !== "PENDING" && offer.status !== "COUNTERED") return false;
  const roundsUsed = offer.negotiations?.length ?? 0;
  if (roundsUsed >= 3) return false;
  const lastSender = offer.negotiations?.[roundsUsed - 1]?.senderType;
  return lastSender !== "agency";
}

function agencyHasActiveOfferStatus(status: Offer["status"]) {
  return status === "PENDING" || status === "COUNTERED" || status === "ACCEPTED";
}

function offerStatusPillClasses(status: Offer["status"]) {
  if (status === "COUNTERED") {
    return "bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)]";
  }
  if (status === "ACCEPTED") {
    return "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]";
  }
  if (status === "REJECTED" || status === "WITHDRAWN") {
    return "bg-[var(--color-sunset-50)] text-[var(--color-sunset-700)]";
  }
  return "bg-[var(--color-surface-2)] text-[var(--color-ink-600)]";
}

// ── Types ─────────────────────────────────────────────────────────────────────

type GroupMembersResponse = {
  group: { id: string };
  members: Array<{
    status: "INTERESTED" | "APPROVED" | "COMMITTED" | "LEFT" | "REMOVED";
    user: UserSummary;
  }>;
};

type MessageableContact = {
  user: UserSummary;
  sharedGroupIds: string[];
};

type AgencyOfferThread = {
  offerId: string;
  planTitle: string;
  destination: string;
  creatorId: string;
  creatorName: string;
  status: Offer["status"];
  updatedAt: string;
  needsResponse: boolean;
};

type AgencyGroupChannel = {
  groupId: string;
  planTitle: string;
  destination: string;
  status: Offer["status"];
  updatedAt: string;
};

// ── Avatar helper ─────────────────────────────────────────────────────────────

function Avatar({
  name,
  size = "md",
  variant = "sea",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  variant?: "sea" | "lavender";
}) {
  const sizeClass = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  const textClass = size === "sm" ? "text-[10px]" : "text-sm";
  const gradientClass =
    variant === "lavender"
      ? "from-[var(--color-lavender-50)] to-[var(--color-lavender-100)] text-[var(--color-lavender-500)]"
      : "from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)]";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-b font-bold",
        sizeClass,
        textClass,
        gradientClass,
      )}
    >
      {initials(name)}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InboxChatbox({ variant }: { variant: "user" | "agency" }) {
  const searchParams = useSearchParams();
  const { session, apiFetchWithAuth } = useAuth();
  const socket = useSocket();

  const targetUserId = searchParams.get("userId");
  const initialConversationId = searchParams.get("conversationId");

  // ── State ──────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [groupChannels, setGroupChannels] = useState<TripMembership[]>([]);
  const [messageableContacts, setMessageableContacts] = useState<MessageableContact[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; fullName: string }>>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [agencyOffers, setAgencyOffers] = useState<Offer[]>([]);
  const [loadingAgencyOffers, setLoadingAgencyOffers] = useState(false);
  const [counterSheetOfferId, setCounterSheetOfferId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const routeIntentHandledRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );
  const activeCounterpartId = activeConversation?.counterpart?.id ?? null;

  const agencyConversationOffers = useMemo(() => {
    if (variant !== "agency" || !activeCounterpartId) return [];
    return agencyOffers
      .filter((offer) => offer.plan?.creator?.id === activeCounterpartId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [activeCounterpartId, agencyOffers, variant]);

  const counteringOffer = counterSheetOfferId
    ? agencyOffers.find((offer) => offer.id === counterSheetOfferId) ?? null
    : null;

  const activeGroupChannels = useMemo(
    () =>
      groupChannels.filter((trip) => {
        const memberActive = trip.status === "APPROVED" || trip.status === "COMMITTED";
        const tripStatus = trip.group.plan?.status ?? trip.group.package?.status;
        const channelOpen =
          !tripStatus || (tripStatus !== "CANCELLED" && tripStatus !== "EXPIRED");
        return memberActive && channelOpen;
      }),
    [groupChannels],
  );

  const conversationByCounterpartId = useMemo(() => {
    const entries = conversations
      .filter((c) => Boolean(c.counterpart?.id))
      .map((c) => [c.counterpart!.id, c] as const);
    return new Map(entries);
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    let list = conversations;
    if (unreadOnly) list = list.filter((c) => c.unreadCount > 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        (c.counterpart?.fullName ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [conversations, search, unreadOnly]);

  const filteredGroups = useMemo(() => {
    if (!search) return activeGroupChannels;
    const q = search.toLowerCase();
    return activeGroupChannels.filter((t) => {
      const title = t.group.plan?.title ?? t.group.package?.title ?? "";
      const dest = t.group.plan?.destination ?? t.group.package?.destination ?? "";
      return title.toLowerCase().includes(q) || dest.toLowerCase().includes(q);
    });
  }, [activeGroupChannels, search]);

  const agencyOfferThreads = useMemo<AgencyOfferThread[]>(() => {
    if (variant !== "agency") return [];
    return agencyOffers
      .filter((offer) => Boolean(offer.plan?.creator?.id))
      .map((offer) => {
        const planTitle = offer.plan?.title ?? "Trip plan";
        const destination = offer.plan?.destination ?? "Destination";
        const creatorId = offer.plan?.creator?.id ?? "";
        const creatorName = offer.plan?.creator?.fullName ?? "Traveler";
        const needsResponse =
          offer.status === "COUNTERED" &&
          (offer.negotiations?.[offer.negotiations.length - 1]?.senderType ?? null) === "user";
        return {
          offerId: offer.id,
          planTitle,
          destination,
          creatorId,
          creatorName,
          status: offer.status,
          updatedAt: offer.updatedAt,
          needsResponse,
        };
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [agencyOffers, variant]);

  const filteredAgencyOfferThreads = useMemo(() => {
    if (variant !== "agency") return [];
    if (!search) return agencyOfferThreads;
    const q = search.toLowerCase();
    return agencyOfferThreads.filter((thread) => {
      return (
        thread.planTitle.toLowerCase().includes(q) ||
        thread.destination.toLowerCase().includes(q) ||
        thread.creatorName.toLowerCase().includes(q)
      );
    });
  }, [agencyOfferThreads, search, variant]);

  const agencyGroupChannels = useMemo<AgencyGroupChannel[]>(() => {
    if (variant !== "agency") return [];

    const grouped = new Map<string, AgencyGroupChannel>();
    for (const offer of agencyOffers) {
      if (!agencyHasActiveOfferStatus(offer.status)) continue;
      const groupId = offer.plan?.group?.id;
      if (!groupId) continue;
      const existing = grouped.get(groupId);
      const channel: AgencyGroupChannel = {
        groupId,
        planTitle: offer.plan?.title ?? "Trip group",
        destination: offer.plan?.destination ?? "Destination",
        status: offer.status,
        updatedAt: offer.updatedAt,
      };
      if (!existing || channel.updatedAt > existing.updatedAt) {
        grouped.set(groupId, channel);
      }
    }

    return Array.from(grouped.values()).sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }, [agencyOffers, variant]);

  const filteredAgencyGroupChannels = useMemo(() => {
    if (variant !== "agency") return [];
    if (!search) return agencyGroupChannels;
    const q = search.toLowerCase();
    return agencyGroupChannels.filter((channel) => {
      return (
        channel.planTitle.toLowerCase().includes(q) ||
        channel.destination.toLowerCase().includes(q)
      );
    });
  }, [agencyGroupChannels, search, variant]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openOrCreateConversation = useCallback(
    async (userId: string) => {
      if (userId === session?.user.id) {
        setFeedback("You cannot start a conversation with yourself.");
        return;
      }
      const existing = conversations.find((c) => c.counterpart?.id === userId);
      if (existing) {
        setActiveConversationId(existing.id);
        setShowMobileChat(true);
        setShowNewChat(false);
        setFeedback(null);
        return;
      }
      try {
        const created = await apiFetchWithAuth<DirectConversation>(
          "/chat/direct/conversations",
          { method: "POST", body: JSON.stringify({ targetUserId: userId }) },
        );
        setConversations((cur) => sortByUpdatedAtDesc([created, ...cur]));
        setActiveConversationId(created.id);
        setShowMobileChat(true);
        setShowNewChat(false);
        setFeedback(null);
      } catch (err) {
        setFeedback(
          err instanceof Error ? err.message : "Unable to start a conversation.",
        );
      }
    },
    [apiFetchWithAuth, conversations, session?.user.id],
  );

  const loadAgencyOffers = useCallback(async () => {
    if (variant !== "agency") return;
    try {
      setLoadingAgencyOffers(true);
      const data = await apiFetchWithAuth<Offer[]>("/offers/my").catch(() => [] as Offer[]);
      setAgencyOffers(data);
    } finally {
      setLoadingAgencyOffers(false);
    }
  }, [apiFetchWithAuth, variant]);

  async function markConversationRead(conversationId: string) {
    await apiFetchWithAuth(`/chat/direct/conversations/${conversationId}/read`, {
      method: "POST",
    });
    setConversations((cur) =>
      cur.map((c) =>
        c.id === conversationId
          ? { ...c, unreadCount: 0, lastReadAt: new Date().toISOString() }
          : c,
      ),
    );
  }

  const emitDirectTyping = (isTyping: boolean) => {
    if (!socket || !activeConversationId) return;
    socket.emit("direct:typing", { conversationId: activeConversationId, isTyping });
    isTypingRef.current = isTyping;
  };

  function sendDirectMessage() {
    if (!activeConversationId) return;
    const content = draft.trim();
    if (!content) return;
    startTransition(async () => {
      try {
        await apiFetchWithAuth(
          `/chat/direct/conversations/${activeConversationId}/messages`,
          { method: "POST", body: JSON.stringify({ content }) },
        );
        setDraft("");
        setFeedback(null);
        emitDirectTyping(false);
      } catch (err) {
        setFeedback(err instanceof Error ? err.message : "Unable to send message.");
      }
    });
  }

  async function handleAgencyCounterOffer(offerId: string, payload: CounterOfferPayload) {
    try {
      await apiFetchWithAuth(`/offers/${offerId}/counter`, {
        method: "POST",
        body: JSON.stringify({
          price: payload.price,
          message: payload.message || undefined,
          inclusionsDelta: payload.requestedAdditions.length
            ? { requestedAdditions: payload.requestedAdditions }
            : undefined,
        }),
      });
      setCounterSheetOfferId(null);
      await loadAgencyOffers();
      setFeedback("Counter offer sent.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to send counter offer.");
    }
  }

  async function handleAgencyWithdrawOffer(offerId: string) {
    if (!confirm("Withdraw this offer? This cannot be undone.")) return;
    try {
      await apiFetchWithAuth(`/offers/${offerId}/withdraw`, { method: "POST" });
      await loadAgencyOffers();
      setFeedback("Offer withdrawn.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to withdraw this offer.");
    }
  }

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      try {
        setLoadingConversations(true);
        const data = await apiFetchWithAuth<DirectConversation[]>(
          "/chat/direct/conversations",
        ).catch(() => [] as DirectConversation[]);
        setConversations(sortByUpdatedAtDesc(data));
      } finally {
        if (variant === "user") {
          try {
            const trips = await apiFetchWithAuth<TripMembership[]>("/groups/my");
            setGroupChannels(trips);
          } catch {
            // non-fatal
          }
        }
        if (variant === "agency") {
          void loadAgencyOffers();
        }
        setLoadingConversations(false);
      }
    })();
  }, [apiFetchWithAuth, loadAgencyOffers, variant]);

  useEffect(() => {
    if (variant !== "agency" || !socket) return;
    const refreshOffers = () => void loadAgencyOffers();
    socket.on("offer:created", refreshOffers);
    socket.on("offer:countered", refreshOffers);
    socket.on("offer:accepted", refreshOffers);
    socket.on("offer:rejected", refreshOffers);
    socket.on("offer:updated", refreshOffers);
    return () => {
      socket.off("offer:created", refreshOffers);
      socket.off("offer:countered", refreshOffers);
      socket.off("offer:accepted", refreshOffers);
      socket.off("offer:rejected", refreshOffers);
      socket.off("offer:updated", refreshOffers);
    };
  }, [loadAgencyOffers, socket, variant]);

  useEffect(() => {
    if (variant !== "user" || !session?.user.id || activeGroupChannels.length === 0) {
      setMessageableContacts([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        setLoadingContacts(true);
        const groups = await Promise.all(
          activeGroupChannels.map((trip) =>
            apiFetchWithAuth<GroupMembersResponse>(
              `/groups/${trip.group.id}/members`,
            ).catch(() => null),
          ),
        );
        if (cancelled) return;
        const next = new Map<string, MessageableContact>();
        for (const groupData of groups) {
          if (!groupData) continue;
          for (const member of groupData.members) {
            if (member.status !== "APPROVED" && member.status !== "COMMITTED") continue;
            if (!member.user.id || member.user.id === session.user.id) continue;
            const cur = next.get(member.user.id);
            if (cur) {
              if (!cur.sharedGroupIds.includes(groupData.group.id))
                cur.sharedGroupIds.push(groupData.group.id);
            } else {
              next.set(member.user.id, {
                user: member.user,
                sharedGroupIds: [groupData.group.id],
              });
            }
          }
        }
        const sorted = Array.from(next.values()).sort((a, b) => {
          if (b.sharedGroupIds.length !== a.sharedGroupIds.length)
            return b.sharedGroupIds.length - a.sharedGroupIds.length;
          return a.user.fullName.localeCompare(b.user.fullName);
        });
        setMessageableContacts(sorted);
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeGroupChannels, apiFetchWithAuth, session?.user.id, variant]);

  useEffect(() => {
    if (loadingConversations || routeIntentHandledRef.current) return;
    routeIntentHandledRef.current = true;
    void (async () => {
      if (initialConversationId) {
        const existing = conversations.find((c) => c.id === initialConversationId);
        if (existing) {
          setActiveConversationId(existing.id);
          setShowMobileChat(true);
          return;
        }
      }
      if (targetUserId) {
        await openOrCreateConversation(targetUserId);
        return;
      }
      if (conversations.length > 0) {
        setActiveConversationId(conversations[0].id);
      }
    })();
  }, [
    conversations,
    initialConversationId,
    loadingConversations,
    openOrCreateConversation,
    targetUserId,
  ]);

  useEffect(() => {
    if (!activeConversationId || conversations.length === 0) return;
    void (async () => {
      try {
        setLoadingMessages(true);
        const data = await apiFetchWithAuth<DirectMessage[]>(
          `/chat/direct/conversations/${activeConversationId}/messages`,
        );
        setMessages(data);
        await markConversationRead(activeConversationId);
      } catch (err) {
        setFeedback(
          err instanceof Error ? err.message : "Unable to load messages.",
        );
      } finally {
        setLoadingMessages(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, apiFetchWithAuth, conversations.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers.length]);

  useEffect(() => {
    if (!socket || !activeConversationId) return;
    socket.emit("direct:subscribe", activeConversationId);
    return () => {
      socket.emit("direct:unsubscribe", activeConversationId);
    };
  }, [activeConversationId, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (payload: { conversationId?: string; message?: DirectMessage }) => {
      if (!payload.conversationId || !payload.message) return;
      const { conversationId, message } = payload;
      const known = conversations.some((c) => c.id === conversationId);

      setConversations((cur) => {
        const next = cur.map((c) => {
          if (c.id !== conversationId) return c;
          if (c.lastMessage?.id === message.id) return c;
          const isMine = message.senderId === session?.user.id;
          const isActive = conversationId === activeConversationId;
          return {
            ...c,
            updatedAt: message.createdAt,
            lastMessage: message,
            unreadCount: isMine || isActive ? 0 : c.unreadCount + 1,
          };
        });
        return sortByUpdatedAtDesc(next);
      });

      if (!known) {
        void apiFetchWithAuth<DirectConversation[]>("/chat/direct/conversations")
          .then((r) => setConversations(sortByUpdatedAtDesc(r)))
          .catch(() => {});
      }

      if (conversationId === activeConversationId) {
        setMessages((cur) => upsertDirectMessage(cur, message));
        if (message.senderId !== session?.user.id) {
          void markConversationRead(conversationId);
        }
      }
    };

    const handleTyping = (payload: {
      conversationId?: string;
      userId?: string;
      fullName?: string;
      isTyping?: boolean;
    }) => {
      if (payload.conversationId !== activeConversationId) return;
      if (!payload.userId || payload.userId === session?.user.id) return;
      const uid = payload.userId;
      const fullName = payload.fullName ?? "Someone";
      const isTyping = Boolean(payload.isTyping);
      setTypingUsers((cur) => {
        if (isTyping) {
          if (cur.some((e) => e.userId === uid)) return cur;
          return [...cur, { userId: uid, fullName }];
        }
        return cur.filter((e) => e.userId !== uid);
      });
    };

    socket.on("direct:message_created", handleMessage);
    socket.on("direct:typing", handleTyping);
    return () => {
      socket.off("direct:message_created", handleMessage);
      socket.off("direct:typing", handleTyping);
    };
  }, [activeConversationId, apiFetchWithAuth, conversations, session?.user.id, socket]);

  useEffect(() => {
    if (!socket || !activeConversationId) return;
    const trimmed = draft.trim();
    if (!trimmed) {
      if (isTypingRef.current) emitDirectTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }
    if (!isTypingRef.current) emitDirectTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitDirectTyping(false), 1400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, draft, socket]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) emitDirectTyping(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="flex overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-md)]"
        style={{ minHeight: "76vh" }}
      >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex w-full flex-col bg-[var(--color-surface-raised)] md:w-[320px] lg:w-[360px] md:border-r md:border-[var(--color-border)]",
          showMobileChat ? "hidden md:flex" : "flex",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-4">
          <h2 className="font-display text-xl text-[var(--color-ink-950)]">Chats</h2>
          <button
            type="button"
            onClick={() => setShowNewChat((v) => !v)}
            title="New chat"
            className={cn(
              "flex size-9 items-center justify-center rounded-full transition",
              showNewChat
                ? "bg-[var(--color-sea-100)] text-[var(--color-sea-700)]"
                : "text-[var(--color-ink-500)] hover:bg-[var(--color-surface-2)]",
            )}
          >
            {showNewChat ? <X className="size-4" /> : <MessageSquarePlus className="size-5" />}
          </button>
        </div>

        {/* Search bar */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-ink-400)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-full bg-[var(--color-surface-2)] py-2 pl-9 pr-3 text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sea-300)]"
            />
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 px-3 pb-2">
          <button
            type="button"
            onClick={() => setUnreadOnly(false)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition",
              !unreadOnly
                ? "bg-[var(--color-sea-600)] text-white"
                : "bg-[var(--color-surface-2)] text-[var(--color-ink-600)] hover:bg-[var(--color-sea-50)]",
            )}
          >
            All
          </button>
          {totalUnread > 0 && (
            <button
              type="button"
              onClick={() => setUnreadOnly(true)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                unreadOnly
                  ? "bg-[var(--color-sea-600)] text-white"
                  : "bg-[var(--color-surface-2)] text-[var(--color-ink-600)] hover:bg-[var(--color-sea-50)]",
              )}
            >
              Unread ({totalUnread})
            </button>
          )}
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {/* New chat: contacts to message */}
          {showNewChat && (
            <div>
              <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-400)]">
                {variant === "agency" ? "Travelers from your offers" : "People you can message"}
              </p>
              {loadingContacts && (
                <p className="px-4 py-2 text-xs text-[var(--color-ink-500)]">Loading contacts…</p>
              )}
              {!loadingContacts && variant === "user" && messageableContacts.length === 0 && (
                <p className="px-4 py-3 text-xs text-[var(--color-ink-500)]">
                  Join and get approved for a trip to see co-travelers here.
                </p>
              )}
              {variant === "user" &&
                messageableContacts.map((contact) => {
                  const hasConvo = conversationByCounterpartId.has(contact.user.id);
                  return (
                    <button
                      key={contact.user.id}
                      type="button"
                      onClick={() => void openOrCreateConversation(contact.user.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-surface-2)]"
                    >
                      <Avatar name={contact.user.fullName} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                          {contact.user.fullName}
                        </p>
                        <p className="text-xs text-[var(--color-ink-500)]">
                          {contact.sharedGroupIds.length} shared trip
                          {contact.sharedGroupIds.length > 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-[var(--color-sea-700)]">
                        {hasConvo ? "Open" : "Start"}
                      </span>
                    </button>
                  );
                })}
              {variant === "agency" &&
                filteredAgencyOfferThreads.map((thread) => {
                  const hasConvo = conversationByCounterpartId.has(thread.creatorId);
                  return (
                    <button
                      key={thread.offerId}
                      type="button"
                      onClick={() => void openOrCreateConversation(thread.creatorId)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-surface-2)]"
                    >
                      <Avatar name={thread.creatorName} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                          {thread.creatorName}
                        </p>
                        <p className="truncate text-xs text-[var(--color-ink-500)]">
                          {thread.planTitle}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-[var(--color-sea-700)]">
                        {hasConvo ? "Open" : "Start"}
                      </span>
                    </button>
                  );
                })}
              {variant === "agency" && filteredAgencyOfferThreads.length === 0 && (
                <p className="px-4 py-3 text-xs text-[var(--color-ink-500)]">
                  Submit an offer to unlock traveler conversations.
                </p>
              )}
              <div className="mx-4 my-2 border-t border-[var(--color-border)]" />
            </div>
          )}

          {/* Loading state */}
          {loadingConversations && (
            <p className="px-4 py-6 text-center text-sm text-[var(--color-ink-400)]">
              Loading chats…
            </p>
          )}

          {/* DM conversations */}
          {!loadingConversations && filteredConversations.length > 0 && (
            <>
              <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-400)]">
                Direct
              </p>
              {filteredConversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const name = conversation.counterpart?.fullName ?? "Unknown";
                const isUnread = conversation.unreadCount > 0;
                const lastTime = chatTime(
                  conversation.lastMessage?.createdAt ?? conversation.updatedAt,
                );
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setActiveConversationId(conversation.id);
                      setTypingUsers([]);
                      setShowMobileChat(true);
                      setShowNewChat(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                      isActive
                        ? "bg-[var(--color-sea-50)]"
                        : "hover:bg-[var(--color-surface-2)]",
                    )}
                  >
                    <Avatar name={name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <p
                          className={cn(
                            "truncate text-sm",
                            isUnread
                              ? "font-bold text-[var(--color-ink-950)]"
                              : "font-medium text-[var(--color-ink-900)]",
                          )}
                        >
                          {name}
                        </p>
                        <p
                          className={cn(
                            "shrink-0 text-[11px]",
                            isUnread
                              ? "font-semibold text-[var(--color-sea-600)]"
                              : "text-[var(--color-ink-400)]",
                          )}
                        >
                          {lastTime}
                        </p>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-1">
                        <p
                          className={cn(
                            "truncate text-xs",
                            isUnread
                              ? "font-medium text-[var(--color-ink-700)]"
                              : "text-[var(--color-ink-500)]",
                          )}
                        >
                          {previewText(conversation.lastMessage?.content)}
                        </p>
                        {isUnread && (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-sea-600)] text-[10px] font-bold text-white">
                            {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {!loadingConversations && variant === "agency" && filteredAgencyOfferThreads.length > 0 && (
            <>
              <div className="mx-4 my-1 border-t border-[var(--color-border)]" />
              <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-400)]">
                Offer threads
              </p>
              {filteredAgencyOfferThreads.map((thread) => {
                const hasConvo = conversationByCounterpartId.has(thread.creatorId);
                return (
                  <button
                    key={thread.offerId}
                    type="button"
                    onClick={() => void openOrCreateConversation(thread.creatorId)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-surface-2)]"
                  >
                    <Avatar name={thread.creatorName} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                          {thread.creatorName}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${offerStatusPillClasses(
                            thread.status,
                          )}`}
                        >
                          {thread.status.toLowerCase()}
                        </span>
                      </div>
                      <p className="truncate text-xs text-[var(--color-ink-500)]">
                        {thread.planTitle}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-[var(--color-sea-700)]">
                      {thread.needsResponse ? "Reply" : hasConvo ? "Open" : "Start"}
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {/* Group channels */}
          {!loadingConversations && filteredGroups.length > 0 && variant === "user" && (
            <>
              <div className="mx-4 my-1 border-t border-[var(--color-border)]" />
              <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-400)]">
                Group Channels
              </p>
              {filteredGroups.map((trip) => {
                const title =
                  trip.group.plan?.title ?? trip.group.package?.title ?? "Trip group";
                const destination =
                  trip.group.plan?.destination ??
                  trip.group.package?.destination ??
                  "Destination";
                const dates = formatDateRange(
                  trip.group.plan?.startDate,
                  trip.group.plan?.endDate,
                );
                return (
                  <Link
                    key={trip.id}
                    href={`/dashboard/groups/${trip.group.id}/chat`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--color-surface-2)]"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)]">
                      <Users className="size-4 text-[var(--color-lavender-500)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                        {title}
                      </p>
                      <p className="flex items-center gap-1 truncate text-xs text-[var(--color-ink-500)]">
                        <MapPin className="size-3 shrink-0" />
                        {destination}
                        {dates !== "Dates flexible" ? ` · ${dates}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-[var(--color-ink-400)]" />
                  </Link>
                );
              })}
            </>
          )}

          {!loadingConversations && filteredAgencyGroupChannels.length > 0 && variant === "agency" && (
            <>
              <div className="mx-4 my-1 border-t border-[var(--color-border)]" />
              <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-400)]">
                Group channels
              </p>
              {filteredAgencyGroupChannels.map((channel) => (
                <Link
                  key={channel.groupId}
                  href={`/agency/groups/${channel.groupId}/chat`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--color-surface-2)]"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)]">
                    <Users className="size-4 text-[var(--color-lavender-500)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                      {channel.planTitle}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-[var(--color-ink-500)]">
                      <MapPin className="size-3 shrink-0" />
                      {channel.destination}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${offerStatusPillClasses(
                      channel.status,
                    )}`}
                  >
                    {channel.status.toLowerCase()}
                  </span>
                </Link>
              ))}
            </>
          )}

          {/* Empty state */}
          {!loadingConversations &&
            filteredConversations.length === 0 &&
            (variant === "user"
              ? filteredGroups.length === 0
              : filteredAgencyOfferThreads.length === 0 &&
                filteredAgencyGroupChannels.length === 0) &&
            !showNewChat && (
              <div className="p-6">
                <EmptyState
                  title={search ? "No results" : "No chats yet"}
                  description={
                    search
                      ? "Try a different name or keyword."
                      : variant === "agency"
                      ? "Send offers to plans to auto-unlock inbox chats and group rooms."
                      : "Join a trip to unlock group channels and co-traveler direct messages."
                  }
                />
              </div>
            )}
        </div>
      </aside>

      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex flex-1 flex-col bg-[var(--color-surface-2)]",
          showMobileChat ? "flex" : "hidden md:flex",
        )}
      >
        {feedback && (
          <div className="m-3 rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] px-4 py-3 text-sm text-[var(--color-sunset-700)]">
            {feedback}
          </div>
        )}

        {!activeConversation ? (
          /* Empty / select state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="flex size-16 items-center justify-center rounded-full bg-[var(--color-sea-50)] shadow-[var(--shadow-sm)]">
              <svg
                className="size-8 text-[var(--color-sea-600)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 0 1 .778-.332 48.294 48.294 0 0 0 5.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-display text-lg text-[var(--color-ink-950)]">
                Select a conversation
              </p>
              <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                Choose a chat from the list or start a new one.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3">
              <button
                type="button"
                onClick={() => setShowMobileChat(false)}
                className="flex size-8 items-center justify-center rounded-full text-[var(--color-ink-600)] transition hover:bg-[var(--color-surface-2)] md:hidden"
              >
                <ArrowLeft className="size-5" />
              </button>
              <Avatar
                name={activeConversation.counterpart?.fullName ?? "?"}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[var(--color-ink-950)]">
                  {activeConversation.counterpart?.fullName ?? "Unknown"}
                </p>
                <p className="text-xs text-[var(--color-ink-500)]">
                  {typingUsers.length > 0
                    ? `${typingUsers.map((e) => e.fullName).join(", ")} typing…`
                    : "Direct message"}
                </p>
              </div>
            </div>

            {variant === "agency" && (
              <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                    Offer flow
                  </p>
                  <Link
                    href="/agency/bids"
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-ink-600)] transition hover:bg-[var(--color-sea-50)]"
                  >
                    <Gavel className="size-3" />
                    Bid manager
                  </Link>
                </div>

                {loadingAgencyOffers ? (
                  <p className="text-xs text-[var(--color-ink-500)]">Loading offers…</p>
                ) : agencyConversationOffers.length === 0 ? (
                  <p className="text-xs text-[var(--color-ink-500)]">
                    No offers with this traveler yet. Send one from the plan page or bid manager.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {agencyConversationOffers.slice(0, 3).map((offer) => {
                      const canCounter = agencyCanCounter(offer);
                      const statusLabel = offer.status.toLowerCase();
                      return (
                        <div
                          key={offer.id}
                          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-[var(--color-ink-900)]">
                                {offer.plan?.title ?? "Trip plan"}
                              </p>
                              <p className="text-[11px] text-[var(--color-ink-500)]">
                                {formatCurrency(offer.pricePerPerson)} / person
                              </p>
                            </div>
                            <span className="rounded-full bg-[var(--color-surface-raised)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-ink-500)]">
                              {statusLabel}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() => setCounterSheetOfferId(offer.id)}
                              disabled={!canCounter}
                            >
                              Counter
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void handleAgencyWithdrawOffer(offer.id)}
                              disabled={offer.status === "ACCEPTED" || offer.status === "REJECTED"}
                            >
                              Withdraw
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
              {loadingMessages ? (
                <p className="py-10 text-center text-sm text-[var(--color-ink-400)]">
                  Loading messages…
                </p>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-[var(--color-ink-400)]">
                    No messages yet — say hello!
                  </p>
                </div>
              ) : (
                <>
                  {messages.map((message, idx) => {
                    const mine = message.senderId === session?.user.id;
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showDate =
                      !prevMsg ||
                      new Date(message.createdAt).toDateString() !==
                        new Date(prevMsg.createdAt).toDateString();

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="my-3 flex items-center justify-center">
                            <span className="rounded-full bg-white/80 px-3 py-0.5 text-[11px] text-[var(--color-ink-500)] shadow-[var(--shadow-sm)]">
                              {isToday(new Date(message.createdAt))
                                ? "Today"
                                : isYesterday(new Date(message.createdAt))
                                ? "Yesterday"
                                : format(new Date(message.createdAt), "dd MMMM yyyy")}
                            </span>
                          </div>
                        )}
                        <div
                          className={cn(
                            "flex",
                            mine ? "justify-end" : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[72%] rounded-[18px] px-4 py-2.5 shadow-sm",
                              mine
                                ? "rounded-tr-[4px] bg-[var(--color-sea-600)] text-white"
                                : "rounded-tl-[4px] bg-white text-[var(--color-ink-900)]",
                            )}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">
                              {message.content}
                            </p>
                            <p
                              className={cn(
                                "mt-0.5 text-right text-[10px]",
                                mine ? "text-white/70" : "text-[var(--color-ink-400)]",
                              )}
                            >
                              {format(new Date(message.createdAt), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {typingUsers.length > 0 && (
                    <div className="flex justify-start">
                      <div className="rounded-[18px] rounded-tl-[4px] bg-white px-4 py-3 shadow-sm">
                        <span className="flex gap-1">
                          <span className="size-1.5 animate-bounce rounded-full bg-[var(--color-ink-400)] [animation-delay:0ms]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-[var(--color-ink-400)] [animation-delay:150ms]" />
                          <span className="size-1.5 animate-bounce rounded-full bg-[var(--color-ink-400)] [animation-delay:300ms]" />
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </>
              )}
            </div>

            {/* Input bar */}
            <div className="flex items-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-3">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendDirectMessage();
                  }
                }}
                placeholder="Type a message…"
                rows={1}
                className="min-h-0 flex-1 resize-none rounded-[18px]"
              />
              <Button
                type="button"
                size="icon"
                onClick={sendDirectMessage}
                disabled={isPending || !draft.trim()}
                className="mb-0.5 size-10 shrink-0 rounded-full"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>
      </div>
      <CounterOfferSheet
        open={counterSheetOfferId !== null}
        onClose={() => setCounterSheetOfferId(null)}
        onSubmit={async (payload) => {
          if (!counterSheetOfferId) return;
          await handleAgencyCounterOffer(counterSheetOfferId, payload);
        }}
        currentPrice={counteringOffer?.pricePerPerson ?? 0}
        counterRound={(counteringOffer?.negotiations?.length ?? 0) + 1}
        maxRounds={3}
      />
    </>
  );
}
