"use client";

import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  CornerUpLeft,
  MapPin,
  MessageSquarePlus,
  MoreVertical,
  Search,
  Send,
  Smile,
  Trash2,
  Users,
  X,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EmojiPicker = dynamic(() => import("@emoji-mart/react"), { ssr: false }) as any;
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { GroupChat } from "@/components/chat/group-chat";
import { OfferCard } from "@/components/chat/offer-card";
import { CounterOfferSheet, type CounterOfferPayload } from "@/components/chat/counter-offer-sheet";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/client";
import { CONVERSATION_READ_EVENT } from "@/lib/realtime/use-live-notifications";
import { useSocket } from "@/lib/realtime/use-socket";
import { formatDateRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  DirectConversation,
  DirectMessage,
  Offer,
  TripMembership,
  UserSummary,
} from "@/lib/api/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

type ChatMessageDeliveryState = "sent" | "pending" | "failed";
type LocalDirectMessage = DirectMessage & {
  clientId?: string;
  isOptimistic?: boolean;
  deliveryState?: ChatMessageDeliveryState;
};

function normalizeDirectMessage(message: DirectMessage): LocalDirectMessage {
  return {
    ...message,
    isOptimistic: false,
    deliveryState: "sent",
  };
}

function upsertDirectMessage(list: LocalDirectMessage[], next: LocalDirectMessage) {
  const idx = list.findIndex((m) => m.id === next.id);
  if (idx === -1)
    return [...list, next].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const clone = [...list];
  clone[idx] = next;
  return clone;
}

function mergeFetchedWithOptimistic(
  current: LocalDirectMessage[],
  fetched: LocalDirectMessage[],
) {
  const optimisticPending = current.filter((message) => message.isOptimistic);
  if (optimisticPending.length === 0) return fetched;

  const pendingWithoutServerEquivalent = optimisticPending.filter((optimisticMessage) => {
    return !fetched.some((serverMessage) => {
      const sameAuthor = serverMessage.senderId === optimisticMessage.senderId;
      const sameContent = serverMessage.content === optimisticMessage.content;
      const timeDistance = Math.abs(
        new Date(serverMessage.createdAt).getTime() -
          new Date(optimisticMessage.createdAt).getTime(),
      );
      return sameAuthor && sameContent && timeDistance < 30_000;
    });
  });

  return [...fetched, ...pendingWithoutServerEquivalent].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

function mergeIncomingMessage(
  current: LocalDirectMessage[],
  incoming: LocalDirectMessage,
) {
  const withoutMatchingOptimistic = current.filter((message) => {
    if (!message.isOptimistic) return true;
    const sameAuthor = message.senderId === incoming.senderId;
    const sameContent = message.content === incoming.content;
    const timeDistance = Math.abs(
      new Date(message.createdAt).getTime() - new Date(incoming.createdAt).getTime(),
    );
    return !(sameAuthor && sameContent && timeDistance < 30_000);
  });

  return upsertDirectMessage(withoutMatchingOptimistic, incoming);
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
  creatorAvatarUrl?: string | null;
  updatedAt: string;
};

const CONVERSATION_CACHE_TTL_MS = 30_000;
const CONTACTS_CACHE_TTL_MS = 60_000;
const CHAT_FETCH_TIMEOUT_MS = 8_000;
const CHAT_READ_TIMEOUT_MS = 4_000;
const CHAT_SEND_TIMEOUT_MS = 8_000;
const CHAT_MESSAGES_PAGE_LIMIT = 50;
const CHAT_FETCH_RETRY_DELAYS_MS = [900, 2_000];
const CHAT_SOCKET_POLL_MS = 4_500;
const READ_API_THROTTLE_MS = 2_500;
const READ_EVENT_THROTTLE_MS = 1_500;
const BLOCKED_DM_CREATE_TTL_MS = 60_000;
const DEFAULT_CHAT_AVATAR_SRC = "/brand/default-avatar.svg";
const PERSISTED_DM_CACHE_VERSION = 1;
const PERSISTED_DM_CACHE_TTL_MS = 24 * 60 * 60_000;
const PERSISTED_DM_MAX_CONVERSATIONS = 60;
const PERSISTED_DM_MAX_MESSAGES_PER_CONVERSATION = 80;

type TimedCache<T> = {
  data: T;
  cachedAt: number;
};

let conversationCache: TimedCache<DirectConversation[]> | null = null;
const contactsCache = new Map<string, TimedCache<MessageableContact[]>>();
const directMessagesCache = new Map<string, TimedCache<LocalDirectMessage[]>>();
const blockedDirectCreateCache = new Map<string, number>();

function isCacheFresh(cachedAt: number, ttlMs: number) {
  return Date.now() - cachedAt < ttlMs;
}

type PersistedDirectCache = {
  version: number;
  userId: string;
  cachedAt: number;
  conversations: DirectConversation[];
  messagesByConversation: Record<string, LocalDirectMessage[]>;
};

function persistedDirectCacheKey(userId: string) {
  return `tripsync.dm.cache.v${PERSISTED_DM_CACHE_VERSION}:${userId}`;
}

function readPersistedDirectCache(userId: string): PersistedDirectCache | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(persistedDirectCacheKey(userId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedDirectCache;
    if (
      parsed.version !== PERSISTED_DM_CACHE_VERSION ||
      parsed.userId !== userId ||
      !Array.isArray(parsed.conversations) ||
      !parsed.messagesByConversation ||
      typeof parsed.cachedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.cachedAt > PERSISTED_DM_CACHE_TTL_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedDirectCache(
  userId: string,
  conversations: DirectConversation[],
  cacheEntries: Array<[string, TimedCache<LocalDirectMessage[]>]>,
) {
  if (typeof window === "undefined") return;
  try {
    const messagesByConversation: Record<string, LocalDirectMessage[]> = {};
    const allowedIds = new Set(
      conversations.slice(0, PERSISTED_DM_MAX_CONVERSATIONS).map((conversation) => conversation.id),
    );
    for (const [conversationId, entry] of cacheEntries) {
      if (!allowedIds.has(conversationId)) continue;
      const trimmed = entry.data.slice(-PERSISTED_DM_MAX_MESSAGES_PER_CONVERSATION);
      if (trimmed.length > 0) {
        messagesByConversation[conversationId] = trimmed;
      }
    }
    const payload: PersistedDirectCache = {
      version: PERSISTED_DM_CACHE_VERSION,
      userId,
      cachedAt: Date.now(),
      conversations: conversations.slice(0, PERSISTED_DM_MAX_CONVERSATIONS),
      messagesByConversation,
    };
    window.localStorage.setItem(persistedDirectCacheKey(userId), JSON.stringify(payload));
  } catch {
    // best-effort only
  }
}

// ── Avatar helper ─────────────────────────────────────────────────────────────

function Avatar({
  name,
  avatarUrl,
  size = "md",
  variant = "sea",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  variant?: "sea" | "lavender";
}) {
  const sizeClass = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  const ringClass =
    variant === "lavender"
      ? "ring-[var(--color-lavender-200)] bg-[var(--color-lavender-50)]"
      : "ring-[var(--color-sea-200)] bg-[var(--color-sea-50)]";
  const resolvedAvatar = avatarUrl?.trim() || DEFAULT_CHAT_AVATAR_SRC;
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden rounded-full ring-1",
        sizeClass,
        ringClass,
      )}
    >
      <img
        src={resolvedAvatar}
        alt={name}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={(event) => {
          const target = event.currentTarget;
          if (target.src.endsWith(DEFAULT_CHAT_AVATAR_SRC)) return;
          target.src = DEFAULT_CHAT_AVATAR_SRC;
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function InboxChatbox({
  variant,
  mobileMessengerMode = false,
}: {
  variant: "user" | "agency";
  mobileMessengerMode?: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { session, apiFetchWithAuth } = useAuth();
  const socket = useSocket();

  const targetUserId = searchParams.get("userId");
  const initialConversationId = searchParams.get("conversationId");
  const initialGroupId = searchParams.get("groupId");
  const hasFreshConversationCache =
    conversationCache && isCacheFresh(conversationCache.cachedAt, CONVERSATION_CACHE_TTL_MS);

  // ── State ──────────────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState<DirectConversation[]>(() =>
    hasFreshConversationCache ? sortByUpdatedAtDesc(conversationCache!.data) : [],
  );
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LocalDirectMessage[]>([]);
  const [groupChannels, setGroupChannels] = useState<TripMembership[]>([]);
  const [messageableContacts, setMessageableContacts] = useState<MessageableContact[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; fullName: string }>>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(!hasFreshConversationCache);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [syncingMessages, setSyncingMessages] = useState(false);
  const [messageSyncIssue, setMessageSyncIssue] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [agencyOffers, setAgencyOffers] = useState<Offer[]>([]);
  const [dmOffers, setDmOffers] = useState<Offer[]>([]);
  const [dmCounterSheetOfferId, setDmCounterSheetOfferId] = useState<string | null>(null);
  const [dmCounterSheetInitialPrice, setDmCounterSheetInitialPrice] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mobileHeaderMenuOpen, setMobileHeaderMenuOpen] = useState(false);
  const [directHeaderMenuOpen, setDirectHeaderMenuOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);

  const routeIntentHandledRef = useRef(false);
  const persistedCacheHydratedUserRef = useRef<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const dmTextareaRef = useRef<HTMLTextAreaElement>(null);
  const mobileHeaderMenuRef = useRef<HTMLDivElement>(null);
  const directHeaderMenuRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<DirectConversation[]>(conversations);
  const pendingDirectCreateRef = useRef<Set<string>>(new Set());
  const readApiAtRef = useRef<Map<string, number>>(new Map());
  const readEventAtRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    conversationsRef.current = conversations;
    conversationCache = {
      data: conversations,
      cachedAt: Date.now(),
    };
  }, [conversations]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      persistedCacheHydratedUserRef.current = null;
      return;
    }
    if (persistedCacheHydratedUserRef.current === userId) return;
    persistedCacheHydratedUserRef.current = userId;

    const persisted = readPersistedDirectCache(userId);
    if (!persisted) return;

    if (conversationsRef.current.length === 0 && persisted.conversations.length > 0) {
      const restored = sortByUpdatedAtDesc(persisted.conversations);
      setConversations(restored);
      setLoadingConversations(false);
    }

    for (const [conversationId, cachedMessages] of Object.entries(
      persisted.messagesByConversation,
    )) {
      if (!Array.isArray(cachedMessages) || cachedMessages.length === 0) continue;
      directMessagesCache.set(conversationId, {
        data: cachedMessages.slice(-PERSISTED_DM_MAX_MESSAGES_PER_CONVERSATION),
        cachedAt: Date.now(),
      });
    }
  }, [session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    writePersistedDirectCache(
      userId,
      sortByUpdatedAtDesc(conversations),
      Array.from(directMessagesCache.entries()),
    );
  }, [conversations, messages, session?.user.id]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

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
        return {
          offerId: offer.id,
          planTitle,
          destination,
          creatorId,
          creatorName,
          creatorAvatarUrl: offer.plan?.creator?.avatarUrl ?? null,
          updatedAt: offer.updatedAt,
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

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );

  const activeCounterpartHandle = activeConversation?.counterpart?.username?.trim() ?? "";
  const counterpartProfileHref = activeCounterpartHandle
    ? `/profile/${encodeURIComponent(activeCounterpartHandle)}`
    : null;
  const mobileExitHref = variant === "agency" ? "/agency/dashboard" : "/dashboard/trips";
  const activeGroupChannel = useMemo(
    () => activeGroupChannels.find((trip) => trip.group.id === activeGroupId) ?? null,
    [activeGroupChannels, activeGroupId],
  );
  const activeGroupTitle = activeGroupChannel
    ? activeGroupChannel.group.plan?.title ??
      activeGroupChannel.group.package?.title ??
      "Trip group"
    : null;
  const activeGroupDestination = activeGroupChannel
    ? activeGroupChannel.group.plan?.destination ??
      activeGroupChannel.group.package?.destination ??
      "Group chat"
    : null;
  const mobileHeaderTitle = showMobileChat
    ? activeConversation
      ? activeConversation.counterpart?.fullName ?? "Direct chat"
      : activeGroupTitle ?? "Trip chat"
    : "Chats";
  const mobileHeaderSubtitle = showMobileChat
    ? activeConversation
      ? typingUsers.length > 0
        ? `${typingUsers.map((e) => e.fullName).join(", ")} typing…`
        : "Direct message"
      : activeGroupDestination ?? "Group channel"
    : totalUnread > 0
    ? `${totalUnread} unread`
    : "Your conversations";
  const mobileShellHeightClass =
    showMobileChat && activeGroupId ? "h-[100svh]" : "h-[calc(100svh-3.5rem)]";

  const clearRouteIntentQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    const hadIntentParams =
      params.has("userId") || params.has("conversationId") || params.has("groupId");
    if (!hadIntentParams) return;
    params.delete("userId");
    params.delete("conversationId");
    params.delete("groupId");
    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const closeDirectMenus = useCallback(() => {
    setMobileHeaderMenuOpen(false);
    setDirectHeaderMenuOpen(false);
  }, []);

  const handleDirectPollAction = useCallback(() => {
    setFeedback("Polls are currently available in group chats.");
    closeDirectMenus();
  }, [closeDirectMenus]);

  const clearActiveDirectMessages = useCallback(() => {
    if (!activeConversationId) return;
    directMessagesCache.delete(activeConversationId);
    setMessages([]);
    setLoadingMessages(false);
    setSyncingMessages(false);
    setMessageSyncIssue(null);
    setFeedback("Messages cleared from this view.");
    closeDirectMenus();
  }, [activeConversationId, closeDirectMenus]);

  const removeActiveDirectConversation = useCallback(() => {
    if (!activeConversationId) return;
    const confirmed = window.confirm("Delete this chat from your inbox?");
    if (!confirmed) return;
    directMessagesCache.delete(activeConversationId);
    readApiAtRef.current.delete(activeConversationId);
    readEventAtRef.current.delete(activeConversationId);
    setConversations((current) =>
      current.filter((conversation) => conversation.id !== activeConversationId),
    );
    setMessages([]);
    setActiveConversationId(null);
    setShowMobileChat(false);
    setFeedback("Chat deleted from inbox.");
    closeDirectMenus();
  }, [activeConversationId, closeDirectMenus]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openOrCreateConversation = useCallback(
    async (userId: string) => {
      if (userId === session?.user.id) {
        setFeedback("You cannot start a conversation with yourself.");
        return;
      }
      const viewerId = session?.user.id ?? null;
      const pendingCreates = pendingDirectCreateRef.current;
      if (pendingCreates.has(userId)) return;
      pendingCreates.add(userId);

      const existing = conversationsRef.current.find((c) => c.counterpart?.id === userId);
      if (existing) {
        setActiveGroupId(null);
        setActiveConversationId(existing.id);
        setShowMobileChat(true);
        setShowNewChat(false);
        setFeedback(null);
        pendingCreates.delete(userId);
        return;
      }

      if (viewerId) {
        const blockedKey = `${viewerId}:${userId}`;
        const blockedUntil = blockedDirectCreateCache.get(blockedKey) ?? 0;
        if (blockedUntil > Date.now()) {
          setFeedback(
            "Direct chat is currently locked for this user. Join a shared trip or offer flow first.",
          );
          pendingCreates.delete(userId);
          return;
        }
      }

      try {
        const created = await apiFetchWithAuth<DirectConversation>(
          "/chat/direct/conversations",
          {
            method: "POST",
            body: JSON.stringify({ targetUserId: userId }),
            timeoutMs: CHAT_FETCH_TIMEOUT_MS,
          },
        );
        setConversations((cur) => sortByUpdatedAtDesc([created, ...cur]));
        setActiveGroupId(null);
        setActiveConversationId(created.id);
        setShowMobileChat(true);
        setShowNewChat(false);
        setFeedback(null);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          if (viewerId) {
            const blockedKey = `${viewerId}:${userId}`;
            blockedDirectCreateCache.set(
              blockedKey,
              Date.now() + BLOCKED_DM_CREATE_TTL_MS,
            );
          }
          setFeedback(
            err.details[0] ??
              "Direct chat is locked until both users satisfy message eligibility rules.",
          );
          return;
        }
        setFeedback(
          err instanceof Error ? err.message : "Unable to start a conversation.",
        );
      } finally {
        pendingCreates.delete(userId);
      }
    },
    [apiFetchWithAuth, session?.user.id],
  );

  const openGroupChannel = useCallback((groupId: string) => {
    setActiveConversationId(null);
    setActiveGroupId(groupId);
    setTypingUsers([]);
    setShowMobileChat(true);
    setShowNewChat(false);
    setFeedback(null);
  }, []);

  const loadAgencyOffers = useCallback(async () => {
    if (variant !== "agency") return;
    const data = await apiFetchWithAuth<Offer[]>("/offers/my").catch(() => [] as Offer[]);
    setAgencyOffers(data);
  }, [apiFetchWithAuth, variant]);

  // ── DM Offer actions ───────────────────────────────────────────────────────
  const handleDmAcceptOffer = useCallback(async (offerId: string) => {
    try {
      const updated = await apiFetchWithAuth<Offer>(`/offers/${offerId}/accept`, { method: "POST" });
      setDmOffers((cur) => cur.map((o) => o.id === offerId ? updated : o));
      setFeedback("Offer accepted!");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not accept the offer.");
    }
  }, [apiFetchWithAuth]);

  const handleDmRejectOffer = useCallback(async (offerId: string) => {
    try {
      const updated = await apiFetchWithAuth<Offer>(`/offers/${offerId}/reject`, { method: "POST" });
      setDmOffers((cur) => cur.map((o) => o.id === offerId ? updated : o));
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not decline the offer.");
    }
  }, [apiFetchWithAuth]);

  const handleDmWithdrawOffer = useCallback(async (offerId: string) => {
    try {
      const updated = await apiFetchWithAuth<Offer>(`/offers/${offerId}/withdraw`, { method: "POST" });
      setDmOffers((cur) => cur.map((o) => o.id === offerId ? updated : o));
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not withdraw the offer.");
    }
  }, [apiFetchWithAuth]);

  const handleDmCounterOffer = useCallback(async (offerId: string, payload: CounterOfferPayload) => {
    try {
      await apiFetchWithAuth(`/offers/${offerId}/counter`, {
        method: "POST",
        body: JSON.stringify({
          price: payload.price,
          message: payload.message,
          inclusionsDelta: payload.requestedAdditions.length > 0
            ? { requestedAdditions: payload.requestedAdditions }
            : undefined,
        }),
      });
      setDmCounterSheetOfferId(null);
      setDmCounterSheetInitialPrice(null);
      // Refresh offers
      const counterpartId = activeConversation?.counterpart?.id;
      if (counterpartId) {
        const refreshed = await apiFetchWithAuth<Offer[]>(`/offers/by-counterpart/${counterpartId}`).catch(() => [] as Offer[]);
        setDmOffers(refreshed);
      }
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not send counter offer.");
    }
  }, [apiFetchWithAuth, activeConversation?.counterpart?.id]);

  const markConversationRead = useCallback((
    conversationId: string,
    options?: { forceRequest?: boolean; forceNotify?: boolean },
  ) => {
    let hadUnread = false;
    const nowIso = new Date().toISOString();
    setConversations((cur) =>
      cur.map((c) =>
        c.id === conversationId
          ? (() => {
              hadUnread = hadUnread || c.unreadCount > 0;
              return c.unreadCount === 0 && c.lastReadAt
                ? c
                : { ...c, unreadCount: 0, lastReadAt: nowIso };
            })()
          : c,
      ),
    );
    const forceRequest = options?.forceRequest ?? false;
    const forceNotify = options?.forceNotify ?? false;
    const shouldRequest = forceRequest || hadUnread;
    const shouldNotify = forceNotify || hadUnread;
    const nowMs = Date.now();

    if (shouldNotify) {
      const lastNotify = readEventAtRef.current.get(conversationId) ?? 0;
      if (nowMs - lastNotify >= READ_EVENT_THROTTLE_MS) {
        readEventAtRef.current.set(conversationId, nowMs);
        window.dispatchEvent(
          new CustomEvent(CONVERSATION_READ_EVENT, {
            detail: { conversationId },
          }),
        );
      }
    }

    if (!shouldRequest) return;
    const lastApiCall = readApiAtRef.current.get(conversationId) ?? 0;
    if (nowMs - lastApiCall < READ_API_THROTTLE_MS) return;
    readApiAtRef.current.set(conversationId, nowMs);

    void apiFetchWithAuth(`/chat/direct/conversations/${conversationId}/read`, {
      method: "POST",
      timeoutMs: CHAT_READ_TIMEOUT_MS,
    }).catch(() => {
      // Non-blocking by design to keep message rendering instant.
    });
  }, [apiFetchWithAuth]);

  const emitDirectTyping = (isTyping: boolean) => {
    if (!socket || !activeConversationId) return;
    socket.emit("direct:typing", { conversationId: activeConversationId, isTyping });
    isTypingRef.current = isTyping;
  };

  async function sendDirectMessage() {
    if (!activeConversationId) return;
    if (!session?.user.id) {
      setFeedback("Session expired. Please log in again.");
      return;
    }
    const content = draft.trim();
    if (!content) return;
    const conversationId = activeConversationId;
    const previousDraft = draft;
    const currentReplyTo = replyTo;
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nowIso = new Date().toISOString();
    const optimisticMessage: LocalDirectMessage = {
      id: optimisticId,
      conversationId,
      senderId: session?.user.id ?? "me",
      content,
      createdAt: nowIso,
      sender: session?.user
        ? {
            id: session.user.id,
            fullName: session.user.fullName,
            username: session.user.username,
            avatarUrl: session.user.avatarUrl,
            city: session.user.city,
            verification: session.user.verification,
            avgRating: session.user.avgRating,
            completedTrips: session.user.completedTrips,
          }
        : null,
      clientId: optimisticId,
      isOptimistic: true,
      deliveryState: "pending",
    };

    setDraft("");
    setReplyTo(null);
    setMessageSyncIssue(null);
    emitDirectTyping(false);

    setMessages((cur) => {
      const next = upsertDirectMessage(cur, optimisticMessage);
      directMessagesCache.set(conversationId, {
        data: next,
        cachedAt: Date.now(),
      });
      return next;
    });

    setConversations((cur) =>
      sortByUpdatedAtDesc(
        cur.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                updatedAt: nowIso,
                unreadCount: 0,
                lastMessage: optimisticMessage,
              }
            : conversation,
        ),
      ),
    );

    try {
      const created = await apiFetchWithAuth<DirectMessage>(
        `/chat/direct/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            content,
            ...(currentReplyTo ? { metadata: { replyTo: currentReplyTo } } : {}),
          }),
          timeoutMs: CHAT_SEND_TIMEOUT_MS,
        },
      );
      const normalized = normalizeDirectMessage(created);
      setMessages((cur) => {
        const withoutOptimistic = cur.filter((message) => message.id !== optimisticId);
        const next = upsertDirectMessage(withoutOptimistic, normalized);
        directMessagesCache.set(conversationId, {
          data: next,
          cachedAt: Date.now(),
        });
        return next;
      });
      setConversations((cur) =>
        sortByUpdatedAtDesc(
          cur.map((conversation) =>
            conversation.id === conversationId
              ? {
                  ...conversation,
                  updatedAt: normalized.createdAt,
                  unreadCount: 0,
                  lastMessage: normalized,
                }
              : conversation,
          ),
        ),
      );
      setFeedback(null);
    } catch (err) {
      setDraft(previousDraft);
      setMessages((cur) => {
        const next = cur.map((message) =>
          message.id === optimisticId
            ? { ...message, deliveryState: "failed" as const, isOptimistic: true }
            : message,
        );
        directMessagesCache.set(conversationId, {
          data: next,
          cachedAt: Date.now(),
        });
        return next;
      });
      setFeedback(err instanceof Error ? err.message : "Unable to send message.");
    }
  }

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.user.id) {
      setConversations([]);
      setLoadingConversations(false);
      return;
    }

    let cancelled = false;

    const cached = conversationCache;
    const hasFreshCache = Boolean(
      cached && isCacheFresh(cached.cachedAt, CONVERSATION_CACHE_TTL_MS),
    );
    if (cached && hasFreshCache) {
      setConversations(sortByUpdatedAtDesc(cached.data));
      setLoadingConversations(false);
    }

    const refreshConversations = async () => {
      try {
        if (!hasFreshCache) {
          setLoadingConversations(true);
        }
        const data = await apiFetchWithAuth<DirectConversation[]>(
          "/chat/direct/conversations",
          { timeoutMs: CHAT_FETCH_TIMEOUT_MS },
        );
        if (cancelled) return;
        setConversations(sortByUpdatedAtDesc(data));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setFeedback("Session expired. Please log in again.");
          return;
        }
        if (!hasFreshCache && conversationsRef.current.length === 0) {
          setFeedback(
            err instanceof Error ? err.message : "Unable to load conversations.",
          );
        }
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    };

    const loadSidebarData = async () => {
      if (variant === "user") {
        try {
          const trips = await apiFetchWithAuth<TripMembership[]>("/groups/my");
          if (!cancelled) setGroupChannels(trips);
        } catch {
          // non-fatal
        }
        return;
      }
      if (variant === "agency") {
        void loadAgencyOffers();
      }
    };

    void refreshConversations();
    void loadSidebarData();

    return () => {
      cancelled = true;
    };
  }, [apiFetchWithAuth, loadAgencyOffers, session?.user.id, variant]);

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
    if (variant !== "user" || !session?.user.id) {
      setMessageableContacts([]);
      setLoadingContacts(false);
      return;
    }

    if (!showNewChat) {
      setLoadingContacts(false);
      return;
    }

    if (activeGroupChannels.length === 0) {
      setMessageableContacts([]);
      setLoadingContacts(false);
      return;
    }

    const groupIds = activeGroupChannels.map((trip) => trip.group.id).sort();
    const cacheKey = `${session.user.id}:${groupIds.join(",")}`;
    const cached = contactsCache.get(cacheKey);
    if (cached && isCacheFresh(cached.cachedAt, CONTACTS_CACHE_TTL_MS)) {
      setMessageableContacts(cached.data);
      setLoadingContacts(false);
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
        contactsCache.set(cacheKey, {
          data: sorted,
          cachedAt: Date.now(),
        });
        setMessageableContacts(sorted);
      } finally {
        if (!cancelled) setLoadingContacts(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeGroupChannels, apiFetchWithAuth, session?.user.id, showNewChat, variant]);

  useEffect(() => {
    if (loadingConversations || routeIntentHandledRef.current) return;
    routeIntentHandledRef.current = true;
    void (async () => {
      if (initialGroupId) {
        openGroupChannel(initialGroupId);
        clearRouteIntentQuery();
        return;
      }
      if (initialConversationId) {
        const existing = conversations.find((c) => c.id === initialConversationId);
        if (existing) {
          setActiveConversationId(existing.id);
          setActiveGroupId(null);
          setShowMobileChat(true);
        }
        clearRouteIntentQuery();
        return;
      }
      if (targetUserId) {
        try {
          await openOrCreateConversation(targetUserId);
        } finally {
          clearRouteIntentQuery();
        }
        return;
      }
    })();
  }, [
    clearRouteIntentQuery,
    conversations,
    initialGroupId,
    initialConversationId,
    loadingConversations,
    openGroupChannel,
    openOrCreateConversation,
    targetUserId,
  ]);

  useEffect(() => {
    if (!initialGroupId) return;
    openGroupChannel(initialGroupId);
  }, [initialGroupId, openGroupChannel]);

  useEffect(() => {
    if (!session?.user.id || !activeConversationId) {
      setMessages([]);
      setLoadingMessages(false);
      setSyncingMessages(false);
      setMessageSyncIssue(null);
      return;
    }

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const cachedEntry = directMessagesCache.get(activeConversationId);
    const hasCachedMessages = Boolean(cachedEntry && cachedEntry.data.length > 0);

    if (hasCachedMessages && cachedEntry) {
      setMessages(cachedEntry.data);
      setLoadingMessages(false);
      setSyncingMessages(true);
      setMessageSyncIssue(null);
    } else {
      setMessages([]);
      setLoadingMessages(true);
      setSyncingMessages(false);
      setMessageSyncIssue(null);
    }

    markConversationRead(activeConversationId);

    const fetchMessages = async (attempt: number) => {
      let scheduledRetry = false;
      try {
        const data = await apiFetchWithAuth<DirectMessage[]>(
          `/chat/direct/conversations/${activeConversationId}/messages`,
          {
            timeoutMs: CHAT_FETCH_TIMEOUT_MS,
            query: { limit: CHAT_MESSAGES_PAGE_LIMIT },
          },
        );
        if (cancelled) return;
        const normalized = data.map(normalizeDirectMessage);
        setMessages((cur) => {
          const next = mergeFetchedWithOptimistic(cur, normalized);
          directMessagesCache.set(activeConversationId, {
            data: next,
            cachedAt: Date.now(),
          });
          return next;
        });
        setLoadingMessages(false);
        setSyncingMessages(false);
        setMessageSyncIssue(null);
        setFeedback(null);
        markConversationRead(activeConversationId);
      } catch (err) {
        if (cancelled) return;
        const fallback = directMessagesCache.get(activeConversationId)?.data ?? [];
        const hasFallback = fallback.length > 0;
        if (hasFallback) {
          setMessages(fallback);
          setLoadingMessages(false);
          setSyncingMessages(true);
        }

        const retriesLeft = attempt < CHAT_FETCH_RETRY_DELAYS_MS.length;
        if (retriesLeft) {
          const retryDelay = CHAT_FETCH_RETRY_DELAYS_MS[attempt];
          scheduledRetry = true;
          retryTimer = setTimeout(() => {
            void fetchMessages(attempt + 1);
          }, retryDelay);
        } else {
          setLoadingMessages(false);
          setSyncingMessages(false);
        }

        const timeoutError = err instanceof ApiError && err.status === 408;
        const unauthorizedError = err instanceof ApiError && err.status === 401;
        if (hasFallback) {
          setMessageSyncIssue(
            unauthorizedError
              ? "Session expired. Please log in again."
              : "Reconnecting… showing cached messages.",
          );
        } else if (timeoutError && retriesLeft) {
          setMessageSyncIssue("Network is slow. Retrying…");
        } else if (unauthorizedError) {
          setMessageSyncIssue("Session expired. Please log in again.");
        } else {
          setMessageSyncIssue(
            err instanceof Error ? err.message : "Unable to load messages.",
          );
        }
      } finally {
        if (!scheduledRetry && !cancelled) {
          setLoadingMessages((current) => (hasCachedMessages ? false : current));
        }
      }
    };

    void fetchMessages(0);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [activeConversationId, apiFetchWithAuth, markConversationRead, session?.user.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers.length]);

  useEffect(() => {
    if (!socket) {
      setIsSocketConnected(false);
      return;
    }
    const syncConnectionState = () => {
      setIsSocketConnected(socket.connected);
    };
    syncConnectionState();
    socket.on("connect", syncConnectionState);
    socket.on("disconnect", syncConnectionState);
    return () => {
      socket.off("connect", syncConnectionState);
      socket.off("disconnect", syncConnectionState);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !session?.user.id || !activeConversationId) return;
    socket.emit("direct:subscribe", activeConversationId);
    return () => {
      socket.emit("direct:unsubscribe", activeConversationId);
    };
  }, [activeConversationId, session?.user.id, socket]);

  useEffect(() => {
    if (!session?.user.id || !activeConversationId || isSocketConnected) return;
    let cancelled = false;

    const pollMessages = async () => {
      try {
        setSyncingMessages(true);
        const data = await apiFetchWithAuth<DirectMessage[]>(
          `/chat/direct/conversations/${activeConversationId}/messages`,
          {
            timeoutMs: CHAT_FETCH_TIMEOUT_MS,
            query: { limit: CHAT_MESSAGES_PAGE_LIMIT },
          },
        );
        if (cancelled) return;
        const normalized = data.map(normalizeDirectMessage);
        setMessages((cur) => {
          const next = mergeFetchedWithOptimistic(cur, normalized);
          directMessagesCache.set(activeConversationId, {
            data: next,
            cachedAt: Date.now(),
          });
          return next;
        });
        setMessageSyncIssue(null);
        markConversationRead(activeConversationId);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            setMessageSyncIssue("Session expired. Please log in again.");
          } else {
            setMessageSyncIssue("Reconnecting… showing cached messages.");
          }
        }
      } finally {
        if (!cancelled) setSyncingMessages(false);
      }
    };

    void pollMessages();
    const intervalId = setInterval(() => {
      void pollMessages();
    }, CHAT_SOCKET_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [
    activeConversationId,
    apiFetchWithAuth,
    isSocketConnected,
    markConversationRead,
    session?.user.id,
  ]);

  useEffect(() => {
    if (!socket || !session?.user.id) return;

    const handleMessage = (payload: { conversationId?: string; message?: DirectMessage }) => {
      if (!payload.conversationId || !payload.message) return;
      const { conversationId } = payload;
      const message = normalizeDirectMessage(payload.message);
      const known = conversationsRef.current.some((c) => c.id === conversationId);

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
        void apiFetchWithAuth<DirectConversation[]>("/chat/direct/conversations", {
          timeoutMs: CHAT_FETCH_TIMEOUT_MS,
        })
          .then((r) => setConversations(sortByUpdatedAtDesc(r)))
          .catch(() => {});
      }

      if (conversationId === activeConversationId) {
        setMessages((cur) => {
          const next = mergeIncomingMessage(cur, message);
          directMessagesCache.set(conversationId, {
            data: next,
            cachedAt: Date.now(),
          });
          return next;
        });
        if (message.senderId !== session?.user.id) {
          markConversationRead(conversationId, {
            forceRequest: true,
            forceNotify: true,
          });
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
  }, [activeConversationId, apiFetchWithAuth, markConversationRead, session?.user.id, socket]);

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

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (!mobileHeaderMenuOpen) return;
    const handleClick = (event: PointerEvent) => {
      if (
        mobileHeaderMenuRef.current &&
        !mobileHeaderMenuRef.current.contains(event.target as Node)
      ) {
        setMobileHeaderMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [mobileHeaderMenuOpen]);

  useEffect(() => {
    if (!directHeaderMenuOpen) return;
    const handleClick = (event: PointerEvent) => {
      if (
        directHeaderMenuRef.current &&
        !directHeaderMenuRef.current.contains(event.target as Node)
      ) {
        setDirectHeaderMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [directHeaderMenuOpen]);

  useEffect(() => {
    if (!showMobileChat) {
      setMobileHeaderMenuOpen(false);
      setDirectHeaderMenuOpen(false);
    }
  }, [showMobileChat]);

  useEffect(() => {
    setMobileHeaderMenuOpen(false);
    setDirectHeaderMenuOpen(false);
  }, [activeConversationId, activeGroupId]);

  // Clear reply state when switching conversations
  useEffect(() => {
    setReplyTo(null);
    setShowEmojiPicker(false);
    setDmOffers([]);
    setDmCounterSheetOfferId(null);
    setDmCounterSheetInitialPrice(null);
  }, [activeConversationId]);

  // Load offers for DM conversations
  useEffect(() => {
    if (!activeConversationId || !activeConversation) return;
    const counterpartId = activeConversation.counterpart?.id;
    if (!counterpartId) return;

    let cancelled = false;
    void (async () => {
      try {
        // For agency variant: filter existing agencyOffers by counterpart (trip creator)
        if (variant === "agency") {
          const relevant = agencyOffers.filter(
            (o) => o.plan?.creator?.id === counterpartId,
          );
          if (!cancelled) setDmOffers(relevant);
          return;
        }
        // Keep direct user chat simple: no inline offer cards in DM flow.
        if (!cancelled) setDmOffers([]);
        return;
      } catch {
        // Non-fatal
      }
    })();
    return () => { cancelled = true; };
  }, [activeConversationId, activeConversation, variant, agencyOffers]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        mobileMessengerMode &&
          "flex h-[100svh] min-h-[100svh] min-w-0 flex-col md:h-full md:min-h-0",
      )}
    >
      {mobileMessengerMode && !(showMobileChat && activeGroupId) && (
        <div className="relative z-40 flex h-14 items-center justify-between overflow-visible border-b border-[var(--color-sea-100)] bg-white/95 px-2.5 backdrop-blur-sm md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            {showMobileChat ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileChat(false);
                    setMobileHeaderMenuOpen(false);
                  }}
                  className="flex size-8 items-center justify-center rounded-full text-[var(--color-sea-700)] transition-all duration-200 hover:bg-[var(--color-sea-50)] active:scale-95"
                  aria-label="Back to chats"
                >
                  <ArrowLeft className="size-4.5" />
                </button>
                {activeConversation ? (
                  counterpartProfileHref ? (
                    <Link
                      href={counterpartProfileHref}
                      onClick={() => setMobileHeaderMenuOpen(false)}
                      className="shrink-0"
                      aria-label="Open profile"
                    >
                      <Avatar
                        name={activeConversation.counterpart?.fullName ?? "?"}
                        avatarUrl={activeConversation.counterpart?.avatarUrl}
                        size="sm"
                      />
                    </Link>
                  ) : (
                    <Avatar
                      name={activeConversation.counterpart?.fullName ?? "?"}
                      avatarUrl={activeConversation.counterpart?.avatarUrl}
                      size="sm"
                    />
                  )
                ) : (
                  <div className="flex size-8 items-center justify-center rounded-full bg-[var(--color-lavender-100)] text-[var(--color-lavender-600)] ring-1 ring-[var(--color-lavender-200)]">
                    <Users className="size-4" />
                  </div>
                )}
                <div className="min-w-0 transition-all duration-250">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
                    {mobileHeaderTitle}
                  </p>
                  <p className="truncate text-[11px] text-[var(--color-ink-500)]">
                    {mobileHeaderSubtitle}
                  </p>
                </div>
              </>
            ) : (
              <Image
                src="/brand/travellersin.png"
                alt="Travellersin"
                width={132}
                height={28}
                className="h-6 w-auto"
                priority={false}
              />
            )}
          </div>
          <div className="relative" ref={mobileHeaderMenuRef}>
            {showMobileChat ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileHeaderMenuOpen((open) => !open);
                    setDirectHeaderMenuOpen(false);
                  }}
                  className="flex size-9 items-center justify-center rounded-full border border-[var(--color-sea-200)] bg-white/85 text-[var(--color-sea-700)] transition-all duration-200 hover:bg-white active:scale-95"
                  aria-label="Open chat options"
                  aria-expanded={mobileHeaderMenuOpen}
                >
                  <MoreVertical className="size-4.5" />
                </button>
                <div
                  className={cn(
                    "absolute right-0 top-[calc(100%+0.35rem)] z-[90] w-44 origin-top-right rounded-2xl border border-[var(--color-sea-100)] bg-white p-1 shadow-[var(--shadow-lg)] transition-all duration-180",
                    mobileHeaderMenuOpen
                      ? "scale-100 opacity-100"
                      : "pointer-events-none scale-95 opacity-0",
                  )}
                >
                  {activeConversation && (
                    <button
                      type="button"
                      onClick={handleDirectPollAction}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-800)] transition hover:bg-[var(--color-sea-50)]"
                    >
                      <BarChart3 className="size-4 text-[var(--color-sea-700)]" />
                      Polls
                    </button>
                  )}
                  {counterpartProfileHref && (
                    <Link
                      href={counterpartProfileHref}
                      onClick={() => setMobileHeaderMenuOpen(false)}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-ink-800)] transition hover:bg-[var(--color-sea-50)]"
                    >
                      View profile
                    </Link>
                  )}
                  {activeConversation && (
                    <button
                      type="button"
                      onClick={clearActiveDirectMessages}
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-800)] transition hover:bg-[var(--color-sea-50)]"
                    >
                      Delete messages
                    </button>
                  )}
                  {activeConversation && (
                    <button
                      type="button"
                      onClick={removeActiveDirectConversation}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--color-sunset-700)] transition hover:bg-[var(--color-sunset-50)]"
                    >
                      <Trash2 className="size-4" />
                      Delete chat
                    </button>
                  )}
                  <Link
                    href={mobileExitHref}
                    onClick={() => setMobileHeaderMenuOpen(false)}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-ink-800)] transition hover:bg-[var(--color-sea-50)]"
                  >
                    Close messenger
                  </Link>
                </div>
              </>
            ) : (
              <Link
                href={mobileExitHref}
                aria-label="Close messenger"
                className="inline-flex size-8 items-center justify-center rounded-full border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] text-[var(--color-sea-700)] transition-all duration-200 hover:bg-[var(--color-sea-100)] active:scale-95"
              >
                <X className="size-3.5" />
              </Link>
            )}
          </div>
        </div>
      )}
      <div
        className={cn(
          "relative flex overflow-hidden bg-[var(--color-surface-raised)]",
          mobileMessengerMode
            ? `${mobileShellHeightClass} min-h-0 flex-1 border-0 md:h-full md:min-h-0 md:rounded-[var(--radius-xl)] md:border md:border-[var(--color-sea-100)] md:shadow-[var(--shadow-lg)]`
            : "min-h-[calc(100dvh-8rem)] border-y border-[var(--color-sea-100)] md:min-h-[76vh] md:rounded-[var(--radius-xl)] md:border md:shadow-[var(--shadow-lg)]",
        )}
      >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "absolute inset-0 z-20 flex min-h-0 w-full flex-col bg-gradient-to-b from-[#f3fff7] via-[var(--color-surface-raised)] to-[#eef8ff] transition-[transform,opacity] duration-300 ease-out md:static md:z-auto md:w-[320px] lg:w-[360px] md:border-r md:border-[var(--color-sea-100)] md:transition-none",
          showMobileChat
            ? "-translate-x-10 opacity-0 pointer-events-none md:translate-x-0 md:opacity-100 md:pointer-events-auto"
            : "translate-x-0 opacity-100",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-sea-100)] bg-gradient-to-r from-[#dcf8e8] via-[#ebfaf3] to-[#f5fffa] px-4 py-4">
          <h2 className="font-display text-xl text-[var(--color-sea-800)]">Chats</h2>
          <button
            type="button"
            onClick={() => setShowNewChat((v) => !v)}
            title="New chat"
            className={cn(
              "flex size-9 items-center justify-center rounded-full border border-transparent transition",
              showNewChat
                ? "border-[var(--color-sea-200)] bg-[var(--color-sea-500)] text-white shadow-[var(--shadow-sm)]"
                : "text-[var(--color-sea-700)] hover:border-[var(--color-sea-200)] hover:bg-[var(--color-sea-50)]",
            )}
          >
            {showNewChat ? <X className="size-4" /> : <MessageSquarePlus className="size-5" />}
          </button>
        </div>

        {/* Search bar */}
        <div className="px-3 py-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-sea-500)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats…"
              className="w-full rounded-full border border-[var(--color-sea-100)] bg-white/90 py-2 pl-9 pr-3 text-base text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] shadow-[var(--shadow-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sea-300)] md:text-sm"
            />
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 px-3 pb-2.5">
          <button
            type="button"
            onClick={() => setUnreadOnly(false)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition",
              !unreadOnly
                ? "border-[var(--color-sea-500)] bg-[var(--color-sea-500)] text-white shadow-[var(--shadow-sm)]"
                : "border-[var(--color-sea-100)] bg-white/85 text-[var(--color-sea-700)] hover:bg-[var(--color-sea-50)]",
            )}
          >
            All
          </button>
          {totalUnread > 0 && (
            <button
              type="button"
              onClick={() => setUnreadOnly(true)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                unreadOnly
                  ? "border-[var(--color-sea-500)] bg-[var(--color-sea-500)] text-white shadow-[var(--shadow-sm)]"
                  : "border-[var(--color-sea-100)] bg-white/85 text-[var(--color-sea-700)] hover:bg-[var(--color-sea-50)]",
              )}
            >
              Unread ({totalUnread})
            </button>
          )}
        </div>

        {/* Scrollable list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
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
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-sea-50)]"
                    >
                      <Avatar
                        name={contact.user.fullName}
                        avatarUrl={contact.user.avatarUrl}
                        size="md"
                      />
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
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--color-sea-50)]"
                    >
                      <Avatar
                        name={thread.creatorName}
                        avatarUrl={thread.creatorAvatarUrl}
                        size="md"
                      />
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
                      setActiveGroupId(null);
                      setActiveConversationId(conversation.id);
                      setTypingUsers([]);
                      setShowMobileChat(true);
                      setShowNewChat(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                      isActive
                        ? "border-l-2 border-[var(--color-sea-500)] bg-[var(--color-sea-50)]"
                        : "hover:bg-[var(--color-sea-50)]",
                    )}
                  >
                    <Avatar
                      name={name}
                      avatarUrl={conversation.counterpart?.avatarUrl}
                      size="md"
                    />
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
                const groupActive = trip.group.id === activeGroupId;
                return (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() => openGroupChannel(trip.group.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                      groupActive
                        ? "border-l-2 border-[var(--color-sea-500)] bg-[var(--color-sea-50)]"
                        : "hover:bg-[var(--color-sea-50)]",
                    )}
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
                  </button>
                );
              })}
            </>
          )}

          {/* Empty state */}
          {!loadingConversations &&
            filteredConversations.length === 0 &&
            (variant === "user"
              ? filteredGroups.length === 0
              : filteredAgencyOfferThreads.length === 0) &&
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
          "absolute inset-0 z-30 flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_18%_16%,rgba(37,211,102,0.14),transparent_28%),radial-gradient(circle_at_82%_4%,rgba(18,140,126,0.16),transparent_30%),linear-gradient(180deg,#e8f3ec_0%,#deebf4_100%)] transition-[transform,opacity] duration-300 ease-out md:static md:z-auto md:transition-none",
          showMobileChat
            ? "translate-x-0 opacity-100"
            : "translate-x-10 opacity-0 pointer-events-none md:translate-x-0 md:opacity-100 md:pointer-events-auto",
        )}
      >
        {feedback && (
          <div className="m-3 rounded-[var(--radius-md)] border border-[var(--color-sunset-200)] bg-[var(--color-sunset-50)] px-4 py-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-sm)]">
            {feedback}
          </div>
        )}

        {activeGroupId ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <GroupChat
              groupId={activeGroupId}
              embedded
              onBack={() => setShowMobileChat(false)}
            />
          </div>
        ) : !activeConversation ? (
          /* Empty / select state */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-b from-[#dcf8e8] to-[#c8f1dc] shadow-[var(--shadow-md)] ring-1 ring-[var(--color-sea-200)]">
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
            <div className="rounded-[var(--radius-md)] border border-white/60 bg-white/55 px-5 py-4 shadow-[var(--shadow-sm)] backdrop-blur-sm">
              <p className="font-display text-lg text-[var(--color-ink-950)]">
                Select a conversation
              </p>
              <p className="mt-1 text-sm text-[var(--color-ink-500)]">
                Choose a direct chat or group channel from the list.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div
              className={cn(
                "relative z-20 shrink-0 items-center gap-3 border-b border-[var(--color-sea-100)] bg-gradient-to-r from-[#dcf8e8] via-[#ebfaf3] to-[#f7fffb] px-4 py-3",
                mobileMessengerMode ? "hidden md:flex" : "flex",
              )}
            >
              <button
                type="button"
                onClick={() => setShowMobileChat(false)}
                className="flex size-8 items-center justify-center rounded-full text-[var(--color-sea-700)] transition hover:bg-white/70 md:hidden"
              >
                <ArrowLeft className="size-5" />
              </button>
              {counterpartProfileHref ? (
                <Link
                  href={counterpartProfileHref}
                  onClick={() => setDirectHeaderMenuOpen(false)}
                  className="shrink-0"
                  aria-label="Open profile"
                >
                  <Avatar
                    name={activeConversation.counterpart?.fullName ?? "?"}
                    avatarUrl={activeConversation.counterpart?.avatarUrl}
                    size="md"
                  />
                </Link>
              ) : (
                <Avatar
                  name={activeConversation.counterpart?.fullName ?? "?"}
                  avatarUrl={activeConversation.counterpart?.avatarUrl}
                  size="md"
                />
              )}
              <div className="min-w-0 flex-1">
                {counterpartProfileHref ? (
                  <Link
                    href={counterpartProfileHref}
                    className="truncate font-semibold text-[var(--color-ink-950)] underline-offset-2 transition hover:text-[var(--color-sea-700)] hover:underline"
                  >
                    {activeConversation.counterpart?.fullName ?? "Unknown"}
                  </Link>
                ) : (
                  <p className="truncate font-semibold text-[var(--color-ink-950)]">
                    {activeConversation.counterpart?.fullName ?? "Unknown"}
                  </p>
                )}
                <p className="text-xs text-[var(--color-ink-500)]">
                  {typingUsers.length > 0
                    ? `${typingUsers.map((e) => e.fullName).join(", ")} typing…`
                    : "Direct message"}
                </p>
              </div>
              <div className="relative shrink-0" ref={directHeaderMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setDirectHeaderMenuOpen((open) => !open);
                    setMobileHeaderMenuOpen(false);
                  }}
                  className="flex size-9 items-center justify-center rounded-full border border-[var(--color-sea-200)] bg-white/85 text-[var(--color-sea-700)] transition hover:bg-white"
                  aria-label="Direct chat actions"
                  aria-expanded={directHeaderMenuOpen}
                >
                  <MoreVertical className="size-4.5" />
                </button>
                <div
                  className={cn(
                    "absolute right-0 top-11 z-[90] w-48 origin-top-right rounded-xl border border-[var(--color-sea-100)] bg-white p-1.5 shadow-[var(--shadow-lg)] transition-all duration-150",
                    directHeaderMenuOpen
                      ? "scale-100 opacity-100"
                      : "pointer-events-none scale-95 opacity-0",
                  )}
                >
                  <button
                    type="button"
                    onClick={handleDirectPollAction}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-ink-800)] transition hover:bg-[var(--color-sea-50)]"
                  >
                    <BarChart3 className="size-4 text-[var(--color-sea-700)]" />
                    Polls
                  </button>
                  {counterpartProfileHref && (
                    <Link
                      href={counterpartProfileHref}
                      onClick={() => setDirectHeaderMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-[var(--color-ink-800)] transition hover:bg-[var(--color-sea-50)]"
                    >
                      View profile
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={clearActiveDirectMessages}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--color-ink-800)] transition hover:bg-[var(--color-sea-50)]"
                  >
                    Delete messages
                  </button>
                  <button
                    type="button"
                    onClick={removeActiveDirectConversation}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-sunset-700)] transition hover:bg-[var(--color-sunset-50)]"
                  >
                    <Trash2 className="size-4" />
                    Delete chat
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
              {/* Offer cards as messages */}
              {dmOffers.length > 0 && (
                <div className="space-y-3 pb-1">
                  {dmOffers.map((offer) => (
                    <div key={`dm-offer-${offer.id}`} className="flex justify-start">
                      <div className="w-full max-w-[92%] sm:max-w-[75%]">
                        <p className="mb-1 pl-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-sea-700)]">
                          {offer.agency?.name ?? "Agency"} · Offer
                        </p>
                        <div className="overflow-hidden rounded-2xl rounded-tl-[6px] border border-white/90 bg-white/95 shadow-sm">
                          <OfferCard
                            compact
                            offer={offer}
                            isCreator={variant === "user"}
                            isAgency={variant === "agency"}
                            onAccept={handleDmAcceptOffer}
                            onCounter={(offerId, seedPrice) => {
                              setDmCounterSheetOfferId(offerId);
                              setDmCounterSheetInitialPrice(seedPrice ?? null);
                            }}
                            onReject={handleDmRejectOffer}
                            onWithdraw={handleDmWithdrawOffer}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(syncingMessages || messageSyncIssue || (socket && !isSocketConnected)) && (
                <div className="sticky top-0 z-10 mx-auto mb-3 w-fit rounded-full border border-[var(--color-sea-200)] bg-white/85 px-3 py-1 text-[11px] text-[var(--color-sea-700)] shadow-[var(--shadow-sm)] backdrop-blur">
                  {messageSyncIssue
                    ? messageSyncIssue
                    : syncingMessages
                    ? "Syncing latest messages…"
                    : "Realtime reconnecting…"}
                </div>
              )}
              {loadingMessages ? (
                <div className="space-y-3 py-6">
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={`dm-skeleton-${idx}`}
                      className={cn("flex", idx % 2 === 0 ? "justify-start" : "justify-end")}
                    >
                      <div className="w-[68%] max-w-[360px] animate-pulse rounded-2xl border border-white/70 bg-white/70 px-3 py-3">
                        <div className="h-2.5 w-3/4 rounded bg-[var(--color-ink-200)]/70" />
                        <div className="mt-2 h-2.5 w-1/2 rounded bg-[var(--color-ink-200)]/60" />
                      </div>
                    </div>
                  ))}
                </div>
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
                        <div className={cn("group flex items-end gap-1", mine ? "justify-end" : "justify-start")}>
                          {mine && (
                            <button
                              type="button"
                              onClick={() => setReplyTo({ id: message.id, content: message.content, senderName: activeConversation?.counterpart?.fullName ?? "Them" })}
                              className="mb-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <CornerUpLeft className="size-3.5 text-[var(--color-ink-400)]" />
                            </button>
                          )}
                          <div
                            className={cn(
                              "w-fit max-w-[82%] rounded-2xl border px-3 py-1.5 shadow-sm",
                              mine
                                ? "rounded-tr-[6px] border-[#18b85c] bg-[linear-gradient(180deg,#25d366_0%,#1ebf5b_100%)] text-[#063d26]"
                                : "rounded-tl-[6px] border-white/90 bg-white/95 text-[var(--color-ink-900)]",
                              message.deliveryState === "failed" && "border-[var(--color-sunset-400)]",
                            )}
                          >
                            {/* Reply quote */}
                            {(message as LocalDirectMessage & { metadata?: { replyTo?: { senderName?: string; content?: string } } }).metadata?.replyTo ? (() => {
                              const rt = (message as LocalDirectMessage & { metadata?: { replyTo?: { senderName?: string; content?: string } } }).metadata!.replyTo!;
                              return (
                                <div className={cn("mb-2 rounded-[10px] border-l-2 px-2.5 py-1.5", mine ? "border-white/50 bg-black/10" : "border-[var(--color-sea-400)] bg-[var(--color-sea-50)]")}>
                                  <p className={cn("text-[10px] font-semibold", mine ? "text-white/70" : "text-[var(--color-sea-700)]")}>{rt.senderName ?? ""}</p>
                                  <p className={cn("truncate text-xs leading-tight", mine ? "text-white/60" : "text-[var(--color-ink-500)]")}>{(rt.content ?? "").slice(0, 80)}</p>
                                </div>
                              );
                            })() : null}
                            <p className="whitespace-pre-wrap text-[14px] leading-[1.35]">
                              {message.content}
                            </p>
                            <p
                              className={cn(
                                "mt-1 text-right text-[10px] leading-none",
                                mine ? "text-[#0a5a34]/70" : "text-[var(--color-ink-400)]",
                              )}
                            >
                              {message.deliveryState === "pending"
                                ? "Sending…"
                                : message.deliveryState === "failed"
                                ? "Failed"
                                : format(new Date(message.createdAt), "HH:mm")}
                            </p>
                          </div>
                          {!mine && (
                            <button
                              type="button"
                              onClick={() => setReplyTo({ id: message.id, content: message.content, senderName: activeConversation?.counterpart?.fullName ?? "Them" })}
                              className="mb-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <CornerUpLeft className="size-3.5 text-[var(--color-ink-400)]" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {typingUsers.length > 0 && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl rounded-tl-[6px] border border-white/90 bg-white/95 px-3 py-2 shadow-sm">
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
            <div className="shrink-0 border-t border-[var(--color-sea-100)] bg-[linear-gradient(180deg,rgba(250,255,252,0.9),rgba(237,249,242,0.95))] backdrop-blur-sm">
              {/* Reply preview */}
              {replyTo && (
                <div className="flex items-center gap-2 border-b border-[var(--color-sea-100)] px-3 py-2">
                  <CornerUpLeft className="size-3.5 shrink-0 text-[var(--color-sea-600)]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-[var(--color-sea-700)]">{replyTo.senderName}</p>
                    <p className="truncate text-xs text-[var(--color-ink-500)]">{replyTo.content.slice(0, 80)}</p>
                  </div>
                  <button type="button" onClick={() => setReplyTo(null)} className="shrink-0 text-[var(--color-ink-400)] hover:text-[var(--color-ink-700)]">
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-2.5">
                {/* Emoji picker */}
                <div className="relative shrink-0" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className="flex size-8 items-center justify-center rounded-full border border-[var(--color-sea-100)] bg-white/90 text-[var(--color-ink-500)] shadow-[var(--shadow-sm)] transition hover:bg-white hover:text-[var(--color-ink-700)]"
                  >
                    <Smile className="size-4" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-11 left-0 z-30">
                      <EmojiPicker
                        onEmojiSelect={(emoji: { native: string }) => {
                          setDraft((d) => d + emoji.native);
                          dmTextareaRef.current?.focus();
                        }}
                        theme="light"
                        previewPosition="none"
                        skinTonePosition="none"
                      />
                    </div>
                  )}
                </div>
                <Textarea
                  ref={dmTextareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowEmojiPicker(false);
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendDirectMessage();
                    }
                  }}
                  placeholder="Type a message…"
                  rows={1}
                  className="min-h-0 flex-1 resize-none rounded-full !border-[var(--color-sea-200)] !bg-white/95 !px-4 !py-2 text-sm leading-5 shadow-[var(--shadow-sm)] focus:!border-[var(--color-sea-300)]"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={sendDirectMessage}
                  disabled={!draft.trim()}
                  className="size-9 shrink-0 rounded-full border border-[#18b85c] bg-[linear-gradient(180deg,#25d366_0%,#1ebe5b_100%)] text-white shadow-[var(--shadow-sm)] transition hover:brightness-[1.05] disabled:border-[var(--color-border)] disabled:bg-[var(--color-surface-3)]"
                >
                  <Send className="size-3.5" />
                </Button>
              </div>
            </div>
            {/* Counter offer sheet for DM offers */}
            {dmCounterSheetOfferId !== null && (
              <CounterOfferSheet
                open
                onClose={() => {
                  setDmCounterSheetOfferId(null);
                  setDmCounterSheetInitialPrice(null);
                }}
                onSubmit={async (payload) => {
                  if (!dmCounterSheetOfferId) return;
                  await handleDmCounterOffer(dmCounterSheetOfferId, payload);
                }}
                currentPrice={dmOffers.find((o) => o.id === dmCounterSheetOfferId)?.pricePerPerson ?? 0}
                initialPrice={dmCounterSheetInitialPrice ?? undefined}
                counterRound={(dmOffers.find((o) => o.id === dmCounterSheetOfferId)?.negotiations?.length ?? 0) + 1}
                maxRounds={3}
                embedded
              />
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
}
