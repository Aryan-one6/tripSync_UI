"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  ArrowLeft,
  AtSign,
  BarChart3,
  MessageSquareMore,
  Minus,
  Plus,
  Receipt,
  Send,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/auth-context";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSocket } from "@/lib/realtime/use-socket";
import { OfferCard } from "@/components/chat/offer-card";
import { CounterOfferSheet, type CounterOfferPayload } from "@/components/chat/counter-offer-sheet";
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
  const { session, apiFetchWithAuth } = useAuth();
  const socket = useSocket();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [resolvedPlanId, setResolvedPlanId] = useState<string | null>(planId ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [counterSheetOfferId, setCounterSheetOfferId] = useState<string | null>(null);
  const [counterSheetInitialPrice, setCounterSheetInitialPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; fullName: string }>>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);

  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    setShowMentionDropdown(mentionQuery !== null && mentionSuggestions.length > 0);
  }, [mentionQuery, mentionSuggestions.length]);

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
    void (async () => {
      try {
        setLoading(true);
        await Promise.all([loadMembers(), loadMessages()]);
      } catch (err) {
        setFeedback(
          err instanceof Error ? err.message : "Unable to load the trip chat.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMembers, loadMessages]);

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

  // ── Actions ─────────────────────────────────────────────────────────────────
  function sendMessage() {
    const content = draft.trim();
    if (!content) return;
    startTransition(async () => {
      try {
        await apiFetchWithAuth(`/chat/groups/${groupId}/messages`, {
          method: "POST",
          body: JSON.stringify({ content }),
        });
        setDraft("");
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

  async function handleCounterOffer(offerId: string, payload: CounterOfferPayload) {
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
    setCounterSheetInitialPrice(null);
    setCounterSheetOfferId(null);
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

  const counteringOffer = counterSheetOfferId
    ? offers.find((o) => o.id === counterSheetOfferId)
    : null;
  const creatorUserId = planCreatorId ?? members.find((member) => member.role === "CREATOR")?.user.id;
  const isCreator = creatorUserId ? userId === creatorUserId : false;

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    if (embedded) {
      return (
        <div className="flex min-h-[320px] items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-white/80 p-6 text-[var(--color-ink-500)]">
          <div className="animate-pulse-soft text-center">
            <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
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
      <div className={cn("grid gap-5 xl:grid-cols-[1.5fr_0.8fr]", embedded && "xl:grid-cols-[1.35fr_0.8fr]")}>
        {/* ── Chat area ── */}
        <div className="space-y-5">
          <Card className="relative overflow-hidden p-5 sm:p-6">
            <div className="relative space-y-5">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]">
                    Live coordination
                  </span>
                  <h2 className="mt-2 font-display text-xl text-[var(--color-ink-950)] sm:text-2xl">
                    Group chat &amp; polls
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  {offers.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById("offers-section")
                          ?.scrollIntoView({ behavior: "smooth" })
                      }
                      className="flex items-center gap-1.5 rounded-full border border-[var(--color-lavender-200)] bg-[var(--color-lavender-50)] px-3 py-1.5 text-xs font-semibold text-[var(--color-lavender-500)] transition-colors hover:bg-[var(--color-lavender-100)]"
                    >
                      <Receipt className="size-3.5" />
                      View all offers ({offers.length})
                    </button>
                  )}
                  <Button variant="soft" size="sm" onClick={() => setPollOpen(true)}>
                    <BarChart3 className="size-4" />
                    Poll
                  </Button>
                </div>
              </div>

              {feedback && (
                <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)]">
                  {feedback}
                </div>
              )}

              {/* Messages */}
              <div className="max-h-[calc(100dvh-220px)] space-y-3 overflow-y-auto sm:max-h-[60vh]">
                {messages.length === 0 ? (
                  <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
                    No messages yet. Coordinate arrivals, budget, and votes here.
                  </CardInset>
                ) : (
                  messages.map((message, idx) => {
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
                      const metaAction =
                        message.metadata &&
                        typeof message.metadata === "object" &&
                        "action" in message.metadata
                          ? String(
                              (message.metadata as Record<string, unknown>).action,
                            )
                          : "";
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
                              "mx-auto flex max-w-lg items-start gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-xs",
                              isSafetyWarning
                                ? "border border-amber-200 bg-amber-50 text-amber-800"
                                : isTripCard
                                ? "border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] text-[var(--color-sea-800)]"
                                : isOfferMsg
                                ? "border border-[var(--color-lavender-200)] bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)] rounded-full"
                                : isPaymentMsg
                                ? "border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] text-[var(--color-sea-700)] rounded-full"
                                : "bg-[var(--color-surface-2)] text-[var(--color-ink-500)] rounded-full",
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
                        <div
                          className={cn(
                            "flex",
                            mine ? "justify-end" : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[85%] rounded-[var(--radius-lg)] px-4 py-3 sm:max-w-[70%] sm:px-5 sm:py-4",
                              mine
                                ? "bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-white shadow-[var(--shadow-sm)]"
                                : "border border-white/60 bg-[var(--color-surface-raised)] text-[var(--color-ink-900)] shadow-[var(--shadow-md)]",
                            )}
                          >
                            {/* Sender + time */}
                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em]">
                              <span className="font-semibold">
                                {message.sender?.fullName ?? "System"}
                              </span>
                              <span
                                className={
                                  mine
                                    ? "text-white/60"
                                    : "text-[var(--color-ink-400)]"
                                }
                              >
                                {chatMsgTime(message.createdAt)}
                              </span>
                            </div>

                            {message.messageType === "poll" ? (
                              <PollCard
                                question={pollQuestion}
                                options={pollOptionsData}
                                currentUserId={session?.user.id ?? ""}
                                isMine={mine}
                                onVote={(optionId) => vote(message.id, optionId)}
                              />
                            ) : (
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                                <MessageContent content={message.content} isMine={mine} />
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
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
              <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-[var(--color-border)] bg-white/95 px-5 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setShowMentionDropdown(false);
                        }
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message… (⌘Enter to send, @ to mention)"
                      rows={2}
                      className="min-h-0"
                    />
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 self-end">
                    <button
                      type="button"
                      onClick={() => {
                        setDraft((d) => d + "@");
                        textareaRef.current?.focus();
                      }}
                      title="Mention someone"
                      className="flex size-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-ink-500)] transition hover:bg-[var(--color-sea-50)] hover:text-[var(--color-sea-700)]"
                    >
                      <AtSign className="size-4" />
                    </button>
                    {isAgency && (
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => setOfferModalOpen(true)}
                        title="Submit an offer"
                        className="flex items-center gap-1.5"
                      >
                        <Receipt className="size-4" />
                        <span className="hidden sm:inline">Offer</span>
                      </Button>
                    )}
                    <Button onClick={sendMessage} disabled={isPending} size="icon">
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Offer cards */}
          {offers.length > 0 && (
            <div id="offers-section" className="scroll-mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-[var(--color-ink-950)]">
                  Offers ({offers.length})
                </h3>
                <span className="text-xs text-[var(--color-ink-500)]">
                  {offers.filter((o) => o.status === "ACCEPTED").length} accepted ·{" "}
                  {offers.filter((o) => o.status === "COUNTERED").length} countered ·{" "}
                  {offers.filter((o) => o.status === "PENDING").length} pending ·{" "}
                  {offers.filter((o) => o.status === "REJECTED" || o.status === "WITHDRAWN").length} closed
                </span>
              </div>
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  isCreator={isCreator}
                  isAgency={isAgency}
                  onAccept={handleAcceptOffer}
                  onCounter={(offerId, seedPrice) => {
                    setCounterSheetOfferId(offerId);
                    setCounterSheetInitialPrice(seedPrice ?? null);
                  }}
                  onReject={handleRejectOffer}
                  onWithdraw={handleWithdrawOffer}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
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
      </div>

      {/* Poll modal */}
      <PollModal
        open={pollOpen}
        onClose={() => setPollOpen(false)}
        onSubmit={createPoll}
        isPending={isPending}
      />

      {/* Submit Offer modal */}
      <SubmitOfferModal
        open={offerModalOpen}
        groupId={groupId}
        planCreatorId={planCreatorId}
        onClose={() => setOfferModalOpen(false)}
        onSubmitted={(offer) => setOffers((c) => upsertOffer(c, offer))}
        apiFetchWithAuth={apiFetchWithAuth}
      />

      {/* Counter Offer sheet */}
      <CounterOfferSheet
        open={counterSheetOfferId !== null}
        onClose={() => {
          setCounterSheetOfferId(null);
          setCounterSheetInitialPrice(null);
        }}
        onSubmit={async (payload) => {
          if (!counterSheetOfferId) return;
          await handleCounterOffer(counterSheetOfferId, payload);
        }}
        currentPrice={counteringOffer?.pricePerPerson ?? 0}
        initialPrice={counterSheetInitialPrice ?? undefined}
        counterRound={(counteringOffer?.negotiations?.length ?? 0) + 1}
        maxRounds={3}
      />
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
