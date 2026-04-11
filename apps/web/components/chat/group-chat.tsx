"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  AtSign,
  BarChart3,
  CornerUpLeft,
  CreditCard,
  LogOut,
  MessageSquareMore,
  Minus,
  MoreVertical,
  Plus,
  Receipt,
  Send,
  Smile,
  Users,
  X,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EmojiPicker = dynamic(() => import("@emoji-mart/react"), { ssr: false }) as any;
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/auth-context";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSocket } from "@/lib/realtime/use-socket";
import { OfferCard, type OfferCounterPayload } from "@/components/chat/offer-card";
import { PollCard } from "@/components/chat/poll-card";
import type { ChatMessage, Group, GroupMember, Offer } from "@/lib/api/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function upsertMessage(list: ChatMessage[], next: ChatMessage) {
  const idx = list.findIndex((m) => m.id === next.id);
  if (idx === -1)
    return [...list, next].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const clone = [...list];
  clone[idx] = next;
  return clone;
}

function upsertOffer(list: Offer[], next: Offer) {
  const idx = list.findIndex((o) => o.id === next.id);
  if (idx === -1) return [...list, next];
  const clone = [...list];
  clone[idx] = next;
  return clone;
}

function chatMsgTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "dd MMM");
}

function messageAction(message: ChatMessage): string {
  if (!message.metadata || typeof message.metadata !== "object" || !("action" in message.metadata)) {
    return "";
  }
  return String((message.metadata as Record<string, unknown>).action ?? "");
}

const GROUP_CHAT_CACHE_TTL_MS = 20_000;

type GroupChatCacheEntry = {
  group: Group | null;
  members: GroupMember[];
  resolvedPlanId: string | null;
  messages: ChatMessage[];
  offers: Offer[];
  cachedAt: number;
};

const groupChatCache = new Map<string, GroupChatCacheEntry>();

function hasFreshGroupChatCache(cacheEntry: GroupChatCacheEntry | undefined) {
  return Boolean(cacheEntry && Date.now() - cacheEntry.cachedAt < GROUP_CHAT_CACHE_TTL_MS);
}

/** Render message content with @mention highlighting */
function MessageContent({
  content,
  isMine,
}: {
  content: string;
  isMine: boolean;
}) {
  const parts = content.split(/(@[A-Za-z][A-Za-z\s]*[A-Za-z]|@[A-Za-z])/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <strong
            key={i}
            className={cn(
              "font-semibold",
              isMine
                ? "text-white underline decoration-dotted decoration-white/60"
                : "text-[var(--color-sea-700)]",
            )}
          >
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

// ── Submit Offer Modal ────────────────────────────────────────────────────────

function SubmitOfferModal({
  open,
  groupId,
  onClose,
  onSubmitted,
  apiFetchWithAuth,
}: {
  open: boolean;
  groupId: string;
  planCreatorId?: string;
  onClose: () => void;
  onSubmitted: (offer: Offer) => void;
  apiFetchWithAuth: <T>(url: string, options?: RequestInit) => Promise<T>;
}) {
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [validHours, setValidHours] = useState("48");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    startTransition(async () => {
      try {
        const validUntil = new Date(
          Date.now() + Number(validHours) * 3_600_000,
        ).toISOString();
        const offer = await apiFetchWithAuth<Offer>(`/groups/${groupId}/offers`, {
          method: "POST",
          body: JSON.stringify({
            pricePerPerson: Number(price),
            message,
            validUntil,
          }),
        });
        onSubmitted(offer);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit offer.");
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Submit an offer"
      description="Propose a price and terms to the trip creator."
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)]">
            {error}
          </div>
        )}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
            Price per person (₹)
          </label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="12000"
            min={0}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
            Validity (hours)
          </label>
          <Input
            type="number"
            value={validHours}
            onChange={(e) => setValidHours(e.target.value)}
            placeholder="48"
            min={1}
            max={168}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
            Message{" "}
            <span className="font-normal text-[var(--color-ink-400)]">(optional)</span>
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="We can arrange transport from Delhi, hotels in Manali…"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !price}>
            {isPending ? "Submitting…" : "Submit offer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Poll Creation Modal ───────────────────────────────────────────────────────

function PollModal({
  open,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (question: string, options: string[]) => void;
  isPending: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);

  function reset() {
    setQuestion("");
    setOptions(["", ""]);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function addOption() {
    if (options.length >= 10) return;
    setOptions((cur) => [...cur, ""]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((cur) => cur.filter((_, i) => i !== idx));
  }

  function updateOption(idx: number, value: string) {
    setOptions((cur) => cur.map((o, i) => (i === idx ? value : o)));
  }

  function handleSubmit() {
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || validOptions.length < 2) return;
    onSubmit(question.trim(), validOptions);
    reset();
  }

  const canSubmit =
    question.trim().length >= 3 &&
    options.filter((o) => o.trim()).length >= 2;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create a poll"
      description="Ask the group a question — everyone can vote."
    >
      <div className="space-y-4">
        {/* Question */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
            Question
          </label>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What time should we depart?"
            maxLength={500}
          />
          <p className="mt-1 text-right text-[10px] text-[var(--color-ink-400)]">
            {question.length}/500
          </p>
        </div>

        {/* Options */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
            Options{" "}
            <span className="font-normal text-[var(--color-ink-400)]">
              (min 2, max 10)
            </span>
          </label>
          <div className="space-y-2">
            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[11px] font-bold text-[var(--color-ink-500)]">
                  {idx + 1}
                </span>
                <Input
                  value={opt}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={200}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-400)] transition hover:bg-[var(--color-sunset-50)] hover:text-[var(--color-sunset-700)]"
                  >
                    <Minus className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {options.length < 10 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[var(--color-sea-700)] transition hover:text-[var(--color-sea-600)]"
            >
              <Plus className="size-4" />
              Add option
            </button>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !canSubmit}>
            {isPending ? "Creating…" : "Create poll"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function GroupChatOffersDrawer({
  offers,
  isCreator,
  isAgency,
  onClose,
  onAccept,
  onReject,
  onWithdraw,
  onCounterSubmit,
}: {
  offers: Offer[];
  isCreator: boolean;
  isAgency: boolean;
  onClose: () => void;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  onWithdraw: (offerId: string) => void;
  onCounterSubmit: (offerId: string, payload: OfferCounterPayload) => Promise<void>;
}) {
  const orderedOffers = useMemo(
    () => offers.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [offers],
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--color-ink-900)]/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-label="Close offers panel"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-xl)] md:w-[430px] lg:w-[480px]">
        <div className="flex items-center justify-between border-b border-[var(--color-sea-100)] bg-gradient-to-r from-[#e9f9ef] to-[#f5fffa] px-4 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
              Offers
            </p>
            <p className="font-display text-lg text-[var(--color-ink-950)]">
              {orderedOffers.length} received
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full border border-[var(--color-sea-200)] bg-white text-[var(--color-ink-600)] transition hover:bg-[var(--color-sea-50)]"
            aria-label="Close offers panel"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {orderedOffers.length === 0 ? (
            <CardInset className="p-5 text-center">
              <p className="text-sm font-medium text-[var(--color-ink-700)]">No offers yet</p>
              <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                New agency offers and negotiations will appear here.
              </p>
            </CardInset>
          ) : (
            orderedOffers.map((offer) => (
              <article key={offer.id} className="rounded-[16px] border border-[var(--color-border)] bg-white/90 shadow-[var(--shadow-sm)]">
                <OfferCard
                  compact
                  enableInlineCounterComposer
                  offer={offer}
                  isCreator={isCreator}
                  isAgency={isAgency}
                  onAccept={onAccept}
                  onReject={onReject}
                  onWithdraw={onWithdraw}
                  onCounterSubmit={onCounterSubmit}
                />
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

// ── Main GroupChat Component ──────────────────────────────────────────────────

export function GroupChat({
  groupId,
  planId,
  planCreatorId,
  embedded = false,
  onBack,
}: {
  groupId: string;
  planId?: string;
  planCreatorId?: string;
  embedded?: boolean;
  onBack?: () => void;
}) {
  const router = useRouter();
  const { session, apiFetchWithAuth } = useAuth();
  const socket = useSocket();
  const cachedGroupChat = groupChatCache.get(groupId);
  const hasWarmCache = hasFreshGroupChatCache(cachedGroupChat);

  const [group, setGroup] = useState<Group | null>(() =>
    hasWarmCache ? (cachedGroupChat?.group ?? null) : null,
  );
  const [members, setMembers] = useState<GroupMember[]>(() =>
    hasWarmCache ? (cachedGroupChat?.members ?? []) : [],
  );
  const [resolvedPlanId, setResolvedPlanId] = useState<string | null>(
    () => planId ?? (hasWarmCache ? (cachedGroupChat?.resolvedPlanId ?? null) : null),
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    hasWarmCache ? (cachedGroupChat?.messages ?? []) : [],
  );
  const [offers, setOffers] = useState<Offer[]>(() =>
    hasWarmCache ? (cachedGroupChat?.offers ?? []) : [],
  );
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offersDrawerOpen, setOffersDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(!hasWarmCache);
  const [isPending, startTransition] = useTransition();
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; fullName: string }>>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const isAgency = session?.role === "agency_admin";
  const userId = session?.user.id;

  // ── @mention detection ──────────────────────────────────────────────────────
  const mentionQuery = useMemo(() => {
    const match = draft.match(/@([^@\n]*)$/);
    return match ? match[1] : null;
  }, [draft]);

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "APPROVED" || m.status === "COMMITTED"),
    [members],
  );

  const mentionSuggestions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return activeMembers
      .filter((m) => m.user.id !== userId)
      .filter(
        (m) => q === "" || m.user.fullName.toLowerCase().startsWith(q),
      )
      .slice(0, 6);
  }, [mentionQuery, activeMembers, userId]);

  useEffect(() => {
    groupChatCache.set(groupId, {
      group,
      members,
      resolvedPlanId,
      messages,
      offers,
      cachedAt: Date.now(),
    });
  }, [groupId, group, members, offers, resolvedPlanId, messages]);

  useEffect(() => {
    setShowMentionDropdown(mentionQuery !== null && mentionSuggestions.length > 0);
  }, [mentionQuery, mentionSuggestions.length]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function insertMention(member: GroupMember) {
    const newDraft = draft.replace(/@([^@\n]*)$/, `@${member.user.fullName} `);
    setDraft(newDraft);
    setShowMentionDropdown(false);
    textareaRef.current?.focus();
  }

  // ── Data loaders ────────────────────────────────────────────────────────────
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket) return;
      socket.emit("group:typing", { groupId, isTyping });
      isTypingRef.current = isTyping;
    },
    [groupId, socket],
  );

  const loadMembers = useCallback(async () => {
    const data = await apiFetchWithAuth<{ group: Group; members: GroupMember[] }>(
      `/groups/${groupId}/members`,
    );
    setGroup(data.group);
    setMembers(data.members);
    const groupPlanId = (data.group as Group & { planId?: string | null }).planId ?? null;
    setResolvedPlanId((current) => current ?? groupPlanId);
  }, [apiFetchWithAuth, groupId]);

  const loadMessages = useCallback(async () => {
    const data = await apiFetchWithAuth<ChatMessage[]>(
      `/chat/groups/${groupId}/messages`,
    );
    setMessages(data);
  }, [apiFetchWithAuth, groupId]);

  const loadOffers = useCallback(async () => {
    const effectivePlanId = planId ?? resolvedPlanId;
    if (!effectivePlanId) return;
    const data = await apiFetchWithAuth<Offer[]>(`/plans/${effectivePlanId}/offers`).catch(
      () => [],
    );
    setOffers(data);
  }, [apiFetchWithAuth, planId, resolvedPlanId]);

  useEffect(() => {
    let cancelled = false;
    const cached = groupChatCache.get(groupId);
    const hasFreshCache = hasFreshGroupChatCache(cached);
    if (hasFreshCache && cached) {
      setGroup(cached.group);
      setMembers(cached.members);
      setMessages(cached.messages);
      setOffers(cached.offers);
      setResolvedPlanId((current) => current ?? cached.resolvedPlanId ?? null);
      setLoading(false);
    }

    void (async () => {
      try {
        if (!hasFreshCache) {
          setLoading(true);
        }
        await loadMessages();
        if (cancelled) return;
        setLoading(false);
        await loadMembers();
      } catch (err) {
        if (!cancelled) {
          setFeedback(
            err instanceof Error ? err.message : "Unable to load the trip chat.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId, loadMembers, loadMessages]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Socket events ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleMessageCreated = (msg: ChatMessage) =>
      setMessages((c) => upsertMessage(c, msg));
    const handleMessageUpdated = (msg: ChatMessage) =>
      setMessages((c) => upsertMessage(c, msg));
    const handleMemberUpdate = () => void loadMembers();

    const refreshOffers = () => {
      void loadOffers();
    };

    const handlePaymentUpdate = (payload: {
      paid: number;
      total: number;
      status: string;
    }) => {
      const text =
        payload.status === "CONFIRMED"
          ? `🎉 All ${payload.total} travelers have paid — the trip is CONFIRMED!`
          : `💳 Payment update: ${payload.paid} of ${payload.total} confirmed.`;
      const syntheticMsg: ChatMessage = {
        id: `payment-sys-${Date.now()}`,
        groupId,
        senderId: "system",
        content: text,
        messageType: "system",
        metadata: { action: "payment_progress", ...payload },
        createdAt: new Date().toISOString(),
      };
      setMessages((c) => upsertMessage(c, syntheticMsg));
    };

    const handleTyping = (payload: {
      groupId?: string;
      userId?: string;
      fullName?: string;
      isTyping?: boolean;
    }) => {
      if (payload.groupId !== groupId) return;
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

    socket.emit("group:subscribe", groupId);
    socket.on("chat:message_created", handleMessageCreated);
    socket.on("chat:message_updated", handleMessageUpdated);
    socket.on("group:member_updated", handleMemberUpdate);
    socket.on("chat:typing", handleTyping);
    socket.on("offer:created", refreshOffers);
    socket.on("offer:countered", refreshOffers);
    socket.on("offer:accepted", refreshOffers);
    socket.on("offer:rejected", refreshOffers);
    socket.on("offer:updated", refreshOffers);
    socket.on("payment:update", handlePaymentUpdate);

    return () => {
      socket.emit("group:unsubscribe", groupId);
      socket.off("chat:message_created", handleMessageCreated);
      socket.off("chat:message_updated", handleMessageUpdated);
      socket.off("group:member_updated", handleMemberUpdate);
      socket.off("chat:typing", handleTyping);
      socket.off("offer:created", refreshOffers);
      socket.off("offer:countered", refreshOffers);
      socket.off("offer:accepted", refreshOffers);
      socket.off("offer:rejected", refreshOffers);
      socket.off("offer:updated", refreshOffers);
      socket.off("payment:update", handlePaymentUpdate);
    };
  }, [groupId, loadMembers, loadOffers, session?.user.id, socket]);

  useEffect(() => {
    if (!socket) return;
    const nextDraft = draft.trim();
    if (!nextDraft) {
      if (isTypingRef.current) emitTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }
    if (!isTypingRef.current) emitTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1400);
  }, [draft, emitTyping, socket]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) emitTyping(false);
    };
  }, [emitTyping]);

  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  function sendMessage() {
    const content = draft.trim();
    if (!content) return;
    const currentReplyTo = replyTo;
    startTransition(async () => {
      try {
        await apiFetchWithAuth(`/chat/groups/${groupId}/messages`, {
          method: "POST",
          body: JSON.stringify({
            content,
            ...(currentReplyTo ? { metadata: { replyTo: currentReplyTo } } : {}),
          }),
        });
        setDraft("");
        setReplyTo(null);
        emitTyping(false);
        setFeedback(null);
      } catch (err) {
        setFeedback(
          err instanceof Error ? err.message : "Unable to send the message.",
        );
      }
    });
  }

  function createPoll(question: string, options: string[]) {
    startTransition(async () => {
      try {
        await apiFetchWithAuth(`/chat/groups/${groupId}/polls`, {
          method: "POST",
          body: JSON.stringify({ question, options }),
        });
        setPollOpen(false);
        setFeedback(null);
      } catch (err) {
        setFeedback(
          err instanceof Error ? err.message : "Unable to create the poll.",
        );
      }
    });
  }

  function vote(messageId: string, optionId: string) {
    startTransition(async () => {
      try {
        await apiFetchWithAuth(`/chat/messages/${messageId}/vote`, {
          method: "POST",
          body: JSON.stringify({ optionId }),
        });
      } catch (err) {
        setFeedback(
          err instanceof Error ? err.message : "Unable to register the vote.",
        );
      }
    });
  }

  async function handleAcceptOffer(offerId: string) {
    try {
      const updated = await apiFetchWithAuth<Offer>(`/offers/${offerId}/accept`, {
        method: "POST",
      });
      setOffers((c) => upsertOffer(c, updated));
      setFeedback("Offer accepted.");
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not accept the offer.");
    }
  }

  async function handleRejectOffer(offerId: string) {
    try {
      const updated = await apiFetchWithAuth<Offer>(`/offers/${offerId}/reject`, {
        method: "POST",
      });
      setOffers((c) => upsertOffer(c, updated));
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Could not reject the offer.",
      );
    }
  }

  async function handleCounterOffer(offerId: string, payload: OfferCounterPayload) {
    await apiFetchWithAuth(`/offers/${offerId}/counter`, {
      method: "POST",
      body: JSON.stringify({
        price: payload.price,
        message: payload.message,
        inclusionsDelta:
          payload.requestedAdditions.length > 0
            ? { requestedAdditions: payload.requestedAdditions }
            : undefined,
      }),
    });
    await loadOffers();
  }

  async function handleWithdrawOffer(offerId: string) {
    try {
      const updated = await apiFetchWithAuth<Offer>(`/offers/${offerId}/withdraw`, {
        method: "POST",
      });
      setOffers((c) => upsertOffer(c, updated));
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Could not withdraw the offer.",
      );
    }
  }

  async function handleLeaveGroup() {
    if (isAgency) {
      setFeedback("Agency accounts cannot leave traveler groups.");
      setMenuOpen(false);
      return;
    }

    try {
      await apiFetchWithAuth(`/groups/${groupId}/leave`, { method: "POST" });
      setMenuOpen(false);
      if (embedded && onBack) onBack();
      router.push("/dashboard/trips");
      router.refresh();
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Unable to leave this group right now.",
      );
      setMenuOpen(false);
    }
  }

  function openOffersDrawer() {
    setOffersDrawerOpen(true);
    setMenuOpen(false);
  }

  function closeOffersDrawer() {
    setOffersDrawerOpen(false);
  }

  function handlePayNow() {
    if (isAgency) {
      setFeedback("Pay now is available only for travelers.");
      setMenuOpen(false);
      return;
    }
    setMenuOpen(false);
    router.push(checkoutHref);
  }

  const creatorUserId = planCreatorId ?? members.find((member) => member.role === "CREATOR")?.user.id;
  const isCreator = creatorUserId ? userId === creatorUserId : false;
  const groupTitle = group?.plan?.title ?? group?.package?.title ?? "Trip group";
  const groupDestination = group?.plan?.destination ?? group?.package?.destination ?? "";
  const groupMembersLabel = `${group?.currentSize ?? activeMembers.length} travelers`;
  const detailsHref = group?.plan?.slug
    ? `/plans/${group.plan.slug}`
    : group?.package?.slug
    ? `/packages/${group.package.slug}`
    : "/dashboard/trips";
  const checkoutHref = `/dashboard/groups/${groupId}/checkout`;
  const isPlanGroup = Boolean(group?.plan);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    if (embedded) {
      return (
        <div className="flex h-full items-center justify-center text-[var(--color-ink-500)]">
          <div className="animate-pulse-soft text-center">
            <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)]" />
            <p className="text-sm">Loading group chat…</p>
          </div>
        </div>
      );
    }
    return (
      <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
        <div className="animate-pulse-soft text-center">
          <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
          <p className="text-sm">Loading group chat…</p>
        </div>
      </Card>
    );
  }

  // ── Embedded render (matches DM UI style) ───────────────────────────────────
  if (embedded) {
    return (
      <>
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Header — same style as DM header */}
          <div className="flex items-center gap-3 border-b border-[var(--color-sea-100)] bg-gradient-to-r from-[#dcf8e8] via-[#ebfaf3] to-[#f7fffb] px-4 py-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--color-sea-700)] transition hover:bg-white/70 md:hidden"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <Link href={detailsHref} className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-300)] text-xs font-bold text-[var(--color-sea-800)] ring-1 ring-[var(--color-sea-200)]">
                {initials(groupTitle)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-[var(--color-ink-950)]">{groupTitle}</p>
                <p className="truncate text-xs text-[var(--color-ink-500)]">
                  {typingUsers.length > 0
                    ? `${typingUsers[0]?.fullName ?? "Someone"} typing…`
                    : `${groupDestination ? `${groupDestination} · ` : ""}${groupMembersLabel}`}
                </p>
              </div>
            </Link>
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((c) => !c)}
                className="flex size-8 items-center justify-center rounded-full border border-[var(--color-sea-200)] bg-white/80 text-[var(--color-ink-600)] transition hover:bg-white"
                aria-label="Group actions"
              >
                <MoreVertical className="size-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-10 z-20 w-52 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-lg)]">
                  <button
                    type="button"
                    onClick={() => { setPollOpen(true); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                  >
                    <BarChart3 className="size-4 text-[var(--color-sea-600)]" />
                    Create poll
                  </button>
                  {isPlanGroup && (
                    <button
                      type="button"
                      onClick={openOffersDrawer}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                    >
                      <Receipt className="size-4 text-[var(--color-lavender-500)]" />
                      See offers
                    </button>
                  )}
                  {isAgency && isPlanGroup && (
                    <button
                      type="button"
                      onClick={() => { setOfferModalOpen(true); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                    >
                      <Receipt className="size-4 text-[var(--color-sea-600)]" />
                      Submit offer
                    </button>
                  )}
                  {!isAgency && (
                    <button
                      type="button"
                      onClick={handlePayNow}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                    >
                      <CreditCard className="size-4 text-[var(--color-sea-700)]" />
                      Pay now
                    </button>
                  )}
                  <div className="my-1 border-t border-[var(--color-border)]" />
                  <button
                    type="button"
                    onClick={() => void handleLeaveGroup()}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--color-sunset-600)] transition hover:bg-[var(--color-sunset-50)]"
                  >
                    <LogOut className="size-4" />
                    Leave group
                  </button>
                </div>
              )}
            </div>
          </div>

          {feedback && (
            <div className="mx-3 mt-3 rounded-[var(--radius-md)] border border-[var(--color-sunset-200)] bg-[var(--color-sunset-50)] px-4 py-2.5 text-sm text-[var(--color-sunset-700)]">
              {feedback}
            </div>
          )}

          {/* Messages */}
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-[var(--color-ink-400)]">No messages yet — say hello!</p>
              </div>
            ) : (
              <>
                {messages.map((message, idx) => {
                  const mine = session?.user.id === message.senderId;
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const showDate =
                    !prevMsg ||
                    new Date(message.createdAt).toDateString() !==
                      new Date(prevMsg.createdAt).toDateString();
                  const pollOptionsData = message.metadata?.options ?? [];
                  const pollQuestion =
                    typeof message.metadata?.question === "string"
                      ? message.metadata.question
                      : message.content;

                  if (message.messageType === "system") {
                    const metaAction = messageAction(message);
                    const isOfferMsg = metaAction.startsWith("offer_");
                    const isPaymentMsg = metaAction.startsWith("payment_");
                    const isSafetyWarning = metaAction === "safety_warning";
                    const isTripCard = metaAction === "trip_contact_card";
                    return (
                      <div key={message.id}>
                        {showDate && <DateDivider date={message.createdAt} />}
                        <div
                          className={cn(
                            "mx-auto flex max-w-lg items-start justify-center gap-2 px-4 py-2 text-center text-xs",
                            isSafetyWarning
                              ? "rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 text-amber-800"
                              : isTripCard
                              ? "rounded-[var(--radius-md)] border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] text-[var(--color-sea-800)]"
                              : isOfferMsg
                              ? "rounded-full border border-[var(--color-lavender-200)] bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)]"
                              : isPaymentMsg
                              ? "rounded-full border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                              : "text-[var(--color-ink-500)]",
                          )}
                        >
                          {isSafetyWarning && <span className="shrink-0 text-base">⚠️</span>}
                          {isTripCard && <span className="shrink-0 text-base">📋</span>}
                          {isOfferMsg && <Receipt className="mt-0.5 size-3.5 shrink-0" />}
                          <span className={cn("leading-relaxed", isSafetyWarning && "font-medium")}>
                            {message.content}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={message.id}>
                      {showDate && <DateDivider date={message.createdAt} />}
                      <div className={cn("group flex items-end gap-1", mine ? "justify-end" : "justify-start")}>
                        {mine && (
                          <button
                            type="button"
                            onClick={() => setReplyTo({ id: message.id, content: message.content, senderName: message.sender?.fullName ?? "Unknown" })}
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
                          )}
                        >
                          {/* Sender name — group-specific */}
                          {!mine && (
                            <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--color-sea-700)]">
                              {message.sender?.fullName ?? "System"}
                            </p>
                          )}
                          {/* Reply quote */}
                          {message.metadata?.replyTo && typeof message.metadata.replyTo === "object" ? (() => {
                            const rt = message.metadata!.replyTo as { senderName?: string; content?: string };
                            return (
                              <div className={cn("mb-2 rounded-[10px] border-l-2 px-2.5 py-1.5", mine ? "border-white/50 bg-black/10" : "border-[var(--color-sea-400)] bg-[var(--color-sea-50)]")}>
                                <p className={cn("text-[10px] font-semibold", mine ? "text-white/70" : "text-[var(--color-sea-700)]")}>
                                  {rt.senderName ?? ""}
                                </p>
                                <p className={cn("truncate text-xs leading-tight", mine ? "text-white/60" : "text-[var(--color-ink-500)]")}>
                                  {(rt.content ?? "").slice(0, 80)}
                                </p>
                              </div>
                            );
                          })() : null}
                          {message.messageType === "poll" ? (
                            <PollCard
                              question={pollQuestion}
                              options={pollOptionsData}
                              currentUserId={session?.user.id ?? ""}
                              isMine={mine}
                              onVote={(optionId) => vote(message.id, optionId)}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap text-[14px] leading-[1.35]">
                              <MessageContent content={message.content} isMine={mine} />
                            </p>
                          )}
                          <p
                            className={cn(
                              "mt-1 text-right text-[10px] leading-none",
                              mine ? "text-[#0a5a34]/70" : "text-[var(--color-ink-400)]",
                            )}
                          >
                            {format(new Date(message.createdAt), "HH:mm")}
                          </p>
                        </div>
                        {!mine && (
                          <button
                            type="button"
                            onClick={() => setReplyTo({ id: message.id, content: message.content, senderName: message.sender?.fullName ?? "Unknown" })}
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
                <div ref={messageEndRef} />
              </>
            )}
          </div>

          {/* @mention dropdown */}
          {showMentionDropdown && (
            <div className="relative z-10">
              <div className="absolute bottom-20 left-4 right-4 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-lg)]">
                <p className="border-b border-[var(--color-border)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-400)]">
                  Tag a member
                </p>
                {mentionSuggestions.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(member);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--color-sea-50)]"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[10px] font-bold text-[var(--color-sea-700)]">
                      {initials(member.user.fullName)}
                    </div>
                    <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                      {member.user.fullName}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="border-t border-[var(--color-sea-100)] bg-[linear-gradient(180deg,rgba(250,255,252,0.9),rgba(237,249,242,0.95))] backdrop-blur-sm">
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
              {isAgency && isPlanGroup && (
                <Button
                  variant="soft"
                  size="icon"
                  onClick={() => setOfferModalOpen(true)}
                  title="Submit an offer"
                  className="size-8 rounded-full border border-[var(--color-sea-200)] bg-white/90 text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]"
                >
                  <Receipt className="size-3.5" />
                </Button>
              )}
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
                        textareaRef.current?.focus();
                      }}
                      theme="light"
                      previewPosition="none"
                      skinTonePosition="none"
                    />
                  </div>
                )}
              </div>
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setShowMentionDropdown(false); setShowEmojiPicker(false); }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type a message… (@ to mention)"
                rows={1}
                className="min-h-0 flex-1 resize-none rounded-full !border-[var(--color-sea-200)] !bg-white/95 !px-4 !py-2 text-sm leading-5 shadow-[var(--shadow-sm)] focus:!border-[var(--color-sea-300)]"
              />
              <Button
                type="button"
                size="icon"
                onClick={sendMessage}
                disabled={isPending || !draft.trim()}
                className="size-9 shrink-0 rounded-full border border-[#18b85c] bg-[linear-gradient(180deg,#25d366_0%,#1ebe5b_100%)] text-white shadow-[var(--shadow-sm)] transition hover:brightness-[1.05] disabled:border-[var(--color-border)] disabled:bg-[var(--color-surface-3)]"
              >
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <PollModal open={pollOpen} onClose={() => setPollOpen(false)} onSubmit={createPoll} isPending={isPending} />
        {isPlanGroup && (
          <SubmitOfferModal
            open={offerModalOpen}
            groupId={groupId}
            planCreatorId={planCreatorId}
            onClose={() => setOfferModalOpen(false)}
            onSubmitted={(offer) => setOffers((c) => upsertOffer(c, offer))}
            apiFetchWithAuth={apiFetchWithAuth}
          />
        )}
        {offersDrawerOpen && isPlanGroup && (
          <GroupChatOffersDrawer
            offers={offers}
            isCreator={isCreator}
            isAgency={isAgency}
            onClose={closeOffersDrawer}
            onAccept={handleAcceptOffer}
            onReject={handleRejectOffer}
            onWithdraw={handleWithdrawOffer}
            onCounterSubmit={handleCounterOffer}
          />
        )}
      </>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {embedded && onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 rounded-full border border-[var(--color-sea-200)] bg-white/85 px-3 py-1.5 text-xs font-semibold text-[var(--color-sea-700)] transition hover:bg-white md:hidden"
        >
          <ArrowLeft className="size-3.5" />
          Back to chats
        </button>
      )}
      <div className={cn("grid gap-5", !embedded && "xl:grid-cols-[1.5fr_0.8fr]")}>
        {/* ── Chat area ── */}
        <div className={cn("space-y-5", embedded && "h-full")}>
          <Card
            className={cn(
              "relative overflow-hidden p-5 sm:p-6",
              embedded && "flex h-full flex-col border-white/70 bg-white/90 p-4 sm:p-5",
            )}
          >
            <div className={cn("relative space-y-5", embedded && "flex h-full min-h-0 flex-col")}>
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <Link href={detailsHref} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-300)] text-sm font-bold text-[var(--color-sea-800)] ring-1 ring-[var(--color-sea-200)]">
                    {initials(groupTitle)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-xl text-[var(--color-ink-950)] sm:text-2xl">
                      {groupTitle}
                    </p>
                    <p className="truncate text-xs text-[var(--color-ink-500)]">
                      {groupDestination ? `${groupDestination} · ` : ""}{groupMembersLabel}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="soft" size="sm" onClick={() => setPollOpen(true)}>
                    <BarChart3 className="size-4" />
                    Poll
                  </Button>
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((current) => !current)}
                      className="flex size-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-ink-600)] transition hover:bg-[var(--color-surface-2)]"
                      aria-label="Group actions"
                    >
                      <MoreVertical className="size-4" />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 top-11 z-20 w-52 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-lg)]">
                        <button
                          type="button"
                          onClick={() => void handleLeaveGroup()}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                        >
                          <LogOut className="size-4 text-[var(--color-sunset-600)]" />
                          Leave group
                        </button>
                        {isPlanGroup && (
                          <button
                            type="button"
                            onClick={openOffersDrawer}
                            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                          >
                            <Receipt className="size-4 text-[var(--color-lavender-500)]" />
                            See offers
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handlePayNow}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
                        >
                          <CreditCard className="size-4 text-[var(--color-sea-700)]" />
                          Pay now
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {feedback && (
                <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)]">
                  {feedback}
                </div>
              )}

              {/* Messages */}
              <div
                className={cn(
                  "space-y-3 overflow-y-auto",
                  embedded ? "min-h-0 flex-1 pr-1" : "max-h-[calc(100dvh-220px)] sm:max-h-[60vh]",
                )}
              >
                {messages.length === 0 ? (
                  <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
                    No messages yet. Coordinate arrivals, budget, and votes here.
                  </CardInset>
                ) : (
                  <>
                    {messages.map((message, idx) => {
                    const mine = session?.user.id === message.senderId;
                    const pollOptionsData = message.metadata?.options ?? [];
                    const pollQuestion =
                      typeof message.metadata?.question === "string"
                        ? message.metadata.question
                        : message.content;

                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showDate =
                      !prevMsg ||
                      new Date(message.createdAt).toDateString() !==
                        new Date(prevMsg.createdAt).toDateString();

                    if (message.messageType === "system") {
                      const metaAction = messageAction(message);
                      const isOfferMsg = metaAction.startsWith("offer_");
                      const isPaymentMsg = metaAction.startsWith("payment_");
                      const isSafetyWarning = metaAction === "safety_warning";
                      const isTripCard = metaAction === "trip_contact_card";

                      return (
                        <div key={message.id}>
                          {showDate && (
                            <DateDivider date={message.createdAt} />
                          )}
                          <div
                            className={cn(
                              "mx-auto flex max-w-lg items-start justify-center gap-2 px-4 py-2.5 text-center text-xs",
                              isSafetyWarning
                                ? "rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 text-amber-800"
                                : isTripCard
                                ? "rounded-[var(--radius-md)] border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] text-[var(--color-sea-800)]"
                                : isOfferMsg
                                ? "border border-[var(--color-lavender-200)] bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)] rounded-full"
                                : isPaymentMsg
                                ? "border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] text-[var(--color-sea-700)] rounded-full"
                                : "text-[var(--color-ink-500)]",
                            )}
                          >
                            {isSafetyWarning && <span className="mt-0.5 shrink-0 text-base">⚠️</span>}
                            {isTripCard && <span className="mt-0.5 shrink-0 text-base">📋</span>}
                            {isOfferMsg && <Receipt className="size-3.5 shrink-0 mt-0.5" />}
                            <span className={cn("leading-relaxed", isSafetyWarning && "font-medium")}>{message.content}</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={message.id}>
                        {showDate && <DateDivider date={message.createdAt} />}
                        <div className={cn("group flex items-end gap-1", mine ? "justify-end" : "justify-start")}>
                          {mine && (
                            <button
                              type="button"
                              onClick={() => setReplyTo({ id: message.id, content: message.content, senderName: message.sender?.fullName ?? "Unknown" })}
                              className="mb-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <CornerUpLeft className="size-3.5 text-[var(--color-ink-400)]" />
                            </button>
                          )}
                          <div
                            className={cn(
                              "w-fit max-w-[82%] rounded-2xl border px-3 py-2 sm:max-w-[74%] sm:px-3.5 sm:py-2.5",
                              mine
                                ? "rounded-tr-[6px] border-[#18b85c] bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-white shadow-[var(--shadow-sm)]"
                                : "rounded-tl-[6px] border-white/60 bg-[var(--color-surface-raised)] text-[var(--color-ink-900)] shadow-[var(--shadow-md)]",
                            )}
                          >
                            {/* Sender + time */}
                            <div className="mb-0.5 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.1em]">
                              {!mine && (
                                <span className="font-semibold text-[var(--color-sea-700)]">
                                  {message.sender?.fullName ?? "System"}
                                </span>
                              )}
                              <span className={mine ? "text-white/60" : "text-[var(--color-ink-400)]"}>
                                {chatMsgTime(message.createdAt)}
                              </span>
                            </div>
                            {/* Reply quote */}
                            {message.metadata?.replyTo && typeof message.metadata.replyTo === "object" ? (() => {
                              const rt = message.metadata!.replyTo as { senderName?: string; content?: string };
                              return (
                                <div className={cn("mt-1 rounded-[8px] border-l-2 px-2 py-1", mine ? "border-white/40 bg-black/10" : "border-[var(--color-sea-400)] bg-[var(--color-sea-50)]")}>
                                  <p className={cn("text-[10px] font-semibold", mine ? "text-white/70" : "text-[var(--color-sea-700)]")}>{rt.senderName ?? ""}</p>
                                  <p className={cn("truncate text-xs leading-tight", mine ? "text-white/60" : "text-[var(--color-ink-500)]")}>{(rt.content ?? "").slice(0, 80)}</p>
                                </div>
                              );
                            })() : null}
                            {message.messageType === "poll" ? (
                              <PollCard
                                question={pollQuestion}
                                options={pollOptionsData}
                                currentUserId={session?.user.id ?? ""}
                                isMine={mine}
                                onVote={(optionId) => vote(message.id, optionId)}
                              />
                            ) : (
                              <p className="mt-1 whitespace-pre-wrap text-[14px] leading-[1.35]">
                                <MessageContent content={message.content} isMine={mine} />
                              </p>
                            )}
                          </div>
                          {!mine && (
                            <button
                              type="button"
                              onClick={() => setReplyTo({ id: message.id, content: message.content, senderName: message.sender?.fullName ?? "Unknown" })}
                              className="mb-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <CornerUpLeft className="size-3.5 text-[var(--color-ink-400)]" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </>
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <p className="text-xs text-[var(--color-ink-500)]">
                  {typingUsers.map((e) => e.fullName).join(", ")}{" "}
                  {typingUsers.length === 1 ? "is" : "are"} typing…
                </p>
              )}

              {/* @mention dropdown */}
              {showMentionDropdown && (
                <div className="relative z-10">
                  <div className="absolute bottom-2 left-0 w-64 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white shadow-[var(--shadow-lg)]">
                    <p className="border-b border-[var(--color-border)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-400)]">
                      Tag a member
                    </p>
                    {mentionSuggestions.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // keep focus in textarea
                          insertMention(member);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[var(--color-sea-50)]"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[10px] font-bold text-[var(--color-sea-700)]">
                          {initials(member.user.fullName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                            {member.user.fullName}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-400)]">
                            {member.status}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Compose */}
              <div
                className={cn(
                  "sticky bottom-0 -mx-5 -mb-5 border-t border-[var(--color-border)] bg-white/95 backdrop-blur-sm sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:backdrop-blur-none",
                  embedded && "static mt-auto mx-0 mb-0 border-t border-[var(--color-border)] bg-white/95 backdrop-blur-none",
                )}
              >
                {/* Reply preview */}
                {replyTo && (
                  <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-5 py-2">
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
                <div className="flex items-center gap-2 px-5 py-3 sm:p-0 sm:pt-3">
                  {isAgency && isPlanGroup && (
                    <Button
                      variant="soft"
                      size="icon"
                      onClick={() => setOfferModalOpen(true)}
                      title="Submit an offer"
                      className="size-8 shrink-0 rounded-full border border-[var(--color-sea-200)] bg-white/90 text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]"
                    >
                      <Receipt className="size-3.5" />
                    </Button>
                  )}
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
                            textareaRef.current?.focus();
                          }}
                          theme="light"
                          previewPosition="none"
                          skinTonePosition="none"
                        />
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowMentionDropdown(false);
                          setShowEmojiPicker(false);
                        }
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message… (⌘Enter to send, @ to mention)"
                      rows={1}
                      className="min-h-0 rounded-full !border-[var(--color-sea-200)] !bg-white/95 !px-4 !py-2 text-sm leading-5 shadow-[var(--shadow-sm)] focus:!border-[var(--color-sea-300)]"
                    />
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={isPending || !draft.trim()}
                    size="icon"
                    className="size-9 shrink-0 rounded-full border border-[#18b85c] bg-[linear-gradient(180deg,#25d366_0%,#1ebe5b_100%)] text-white shadow-[var(--shadow-sm)] transition hover:brightness-[1.05] disabled:border-[var(--color-border)] disabled:bg-[var(--color-surface-3)]"
                  >
                    <Send className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

        </div>

        {/* ── Sidebar ── */}
        {!embedded && (
          <div className="space-y-5">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                    Room
                  </p>
                  <p className="font-display text-lg text-[var(--color-ink-950)]">
                    {group?.currentSize ?? activeMembers.length} travelers
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {activeMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-3 py-2.5"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-xs font-bold text-[var(--color-sea-700)]">
                      {initials(member.user.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      {member.user.username ? (
                        <Link
                          href={`/profile/${member.user.username}`}
                          className="truncate text-sm font-medium text-[var(--color-ink-900)] transition hover:text-[var(--color-sea-700)]"
                        >
                          {member.user.fullName}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                          {member.user.fullName}
                        </p>
                      )}
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">
                        {member.status}
                      </p>
                    </div>
                    {/* @ shortcut */}
                    <button
                      type="button"
                      title={`Mention ${member.user.fullName}`}
                      onClick={() => {
                        const mention = `@${member.user.fullName} `;
                        setDraft((d) => {
                          const trimmed = d.trimEnd();
                          return trimmed ? `${trimmed} ${mention}` : mention;
                        });
                        textareaRef.current?.focus();
                        // scroll chat into view
                        document
                          .querySelector("textarea")
                          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                      }}
                      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-400)] transition hover:bg-[var(--color-sea-50)] hover:text-[var(--color-sea-700)]"
                    >
                      <AtSign className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            <CardInset className="flex items-start gap-3 p-4 text-sm text-[var(--color-ink-600)]">
              <MessageSquareMore className="mt-0.5 size-4 shrink-0 text-[var(--color-sea-600)]" />
              <span>
                Type <strong>@</strong> in the message box to tag a member, or click{" "}
                <AtSign className="mb-0.5 inline size-3" /> next to their name.
              </span>
            </CardInset>
          </div>
        )}
      </div>

      {/* Poll modal */}
      <PollModal
        open={pollOpen}
        onClose={() => setPollOpen(false)}
        onSubmit={createPoll}
        isPending={isPending}
      />

      {/* Submit Offer modal — only for user-plan groups */}
      {isPlanGroup && (
        <SubmitOfferModal
          open={offerModalOpen}
          groupId={groupId}
          planCreatorId={planCreatorId}
          onClose={() => setOfferModalOpen(false)}
          onSubmitted={(offer) => setOffers((c) => upsertOffer(c, offer))}
          apiFetchWithAuth={apiFetchWithAuth}
        />
      )}

      {offersDrawerOpen && isPlanGroup && (
        <GroupChatOffersDrawer
          offers={offers}
          isCreator={isCreator}
          isAgency={isAgency}
          onClose={closeOffersDrawer}
          onAccept={handleAcceptOffer}
          onReject={handleRejectOffer}
          onWithdraw={handleWithdrawOffer}
          onCounterSubmit={handleCounterOffer}
        />
      )}
    </>
  );
}

// ── Date divider helper ───────────────────────────────────────────────────────

function DateDivider({ date }: { date: string }) {
  const d = new Date(date);
  const label = isToday(d)
    ? "Today"
    : isYesterday(d)
    ? "Yesterday"
    : format(d, "dd MMMM yyyy");
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="flex-1 border-t border-[var(--color-border)]" />
      <span className="rounded-full bg-[var(--color-surface-2)] px-3 py-0.5 text-[11px] text-[var(--color-ink-400)]">
        {label}
      </span>
      <div className="flex-1 border-t border-[var(--color-border)]" />
    </div>
  );
}
