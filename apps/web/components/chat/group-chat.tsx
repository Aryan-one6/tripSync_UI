"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MessageSquareMore, PlusCircle, Receipt, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCompactDate, initials } from "@/lib/format";
import { useSocket } from "@/lib/realtime/use-socket";
import { OfferCard } from "@/components/chat/offer-card";
import { CounterOfferSheet, type CounterOfferPayload } from "@/components/chat/counter-offer-sheet";
import { PollCard } from "@/components/chat/poll-card";
import type { ChatMessage, Group, GroupMember, Offer } from "@/lib/api/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function upsertMessage(list: ChatMessage[], next: ChatMessage) {
  const existingIndex = list.findIndex((message) => message.id === next.id);
  if (existingIndex === -1) {
    return [...list, next].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
  const clone = [...list];
  clone[existingIndex] = next;
  return clone;
}

function upsertOffer(list: Offer[], next: Offer) {
  const idx = list.findIndex((o) => o.id === next.id);
  if (idx === -1) return [...list, next];
  const clone = [...list];
  clone[idx] = next;
  return clone;
}

// ─── Submit Offer Modal ───────────────────────────────────────────────────────

function SubmitOfferModal({
  open,
  groupId,
  planCreatorId,
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
            Message <span className="text-[var(--color-ink-400)] font-normal">(optional)</span>
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="We can arrange transport from Delhi, hotels in Manali..."
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending || !price}>
            {isPending ? "Submitting..." : "Submit offer"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main GroupChat Component ─────────────────────────────────────────────────

export function GroupChat({ groupId, planId, planCreatorId }: {
  groupId: string;
  planId?: string;
  planCreatorId?: string;
}) {
  const { session, apiFetchWithAuth } = useAuth();
  const socket = useSocket();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [counterSheetOfferId, setCounterSheetOfferId] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("Yes\nNo");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; fullName: string }>>([]);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const isAgency = session?.role === "agency_admin";
  const userId = session?.user.id;

  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket) return;
      socket.emit("group:typing", { groupId, isTyping });
      isTypingRef.current = isTyping;
    },
    [groupId, socket],
  );

  const loadMembers = useCallback(async () => {
    const data = await apiFetchWithAuth<{ group: Group; members: GroupMember[] }>(`/groups/${groupId}/members`);
    setGroup(data.group);
    setMembers(data.members);
  }, [apiFetchWithAuth, groupId]);

  const loadMessages = useCallback(async () => {
    const data = await apiFetchWithAuth<ChatMessage[]>(`/chat/groups/${groupId}/messages`);
    setMessages(data);
  }, [apiFetchWithAuth, groupId]);

  const loadOffers = useCallback(async () => {
    if (!planId) return;
    const data = await apiFetchWithAuth<Offer[]>(`/plans/${planId}/offers`).catch(() => []);
    setOffers(data);
  }, [apiFetchWithAuth, planId]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await Promise.all([loadMembers(), loadMessages(), loadOffers()]);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to load the trip chat.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMembers, loadMessages, loadOffers]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    const handleMessageCreated = (message: ChatMessage) => setMessages((c) => upsertMessage(c, message));
    const handleMessageUpdated = (message: ChatMessage) => setMessages((c) => upsertMessage(c, message));
    const handleMemberUpdate = () => void loadMembers();

    // ── Offer socket events (Phase 4) ──
    const handleOfferCreated = (offer: Offer) => setOffers((c) => upsertOffer(c, offer));
    const handleOfferCountered = (offer: Offer) => setOffers((c) => upsertOffer(c, offer));
    const handleOfferAccepted = (offer: Offer) => setOffers((c) => upsertOffer(c, offer));
    const handleOfferRejected = (offer: Offer) => setOffers((c) => upsertOffer(c, offer));

    // ── Payment socket events (Phase 5.2) ──
    const handlePaymentUpdate = (payload: { paid: number; total: number; status: string }) => {
      const syntheticId = `payment-sys-${Date.now()}`;
      const text =
        payload.status === "CONFIRMED"
          ? `🎉 All ${payload.total} travelers have paid — the trip is CONFIRMED!`
          : `💳 Payment update: ${payload.paid} of ${payload.total} confirmed.`;
      const syntheticMsg: ChatMessage = {
        id: syntheticId,
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
      setTypingUsers((current) => {
        if (isTyping) {
          if (current.some((entry) => entry.userId === uid)) return current;
          return [...current, { userId: uid, fullName }];
        }
        return current.filter((entry) => entry.userId !== uid);
      });
    };

    socket.emit("group:subscribe", groupId);
    socket.on("chat:message_created", handleMessageCreated);
    socket.on("chat:message_updated", handleMessageUpdated);
    socket.on("group:member_updated", handleMemberUpdate);
    socket.on("chat:typing", handleTyping);
    socket.on("offer:created", handleOfferCreated);
    socket.on("offer:countered", handleOfferCountered);
    socket.on("offer:accepted", handleOfferAccepted);
    socket.on("offer:rejected", handleOfferRejected);
    socket.on("payment:update", handlePaymentUpdate);

    return () => {
      socket.emit("group:unsubscribe", groupId);
      socket.off("chat:message_created", handleMessageCreated);
      socket.off("chat:message_updated", handleMessageUpdated);
      socket.off("group:member_updated", handleMemberUpdate);
      socket.off("chat:typing", handleTyping);
      socket.off("offer:created", handleOfferCreated);
      socket.off("offer:countered", handleOfferCountered);
      socket.off("offer:accepted", handleOfferAccepted);
      socket.off("offer:rejected", handleOfferRejected);
      socket.off("payment:update", handlePaymentUpdate);
    };
  }, [groupId, loadMembers, session?.user.id, socket]);

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

  const activeMembers = useMemo(
    () => members.filter((m) => m.status === "APPROVED" || m.status === "COMMITTED"),
    [members],
  );

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
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to send the message.");
      }
    });
  }

  function createPoll() {
    const options = pollOptions.split("\n").map((o) => o.trim()).filter(Boolean);
    startTransition(async () => {
      try {
        await apiFetchWithAuth(`/chat/groups/${groupId}/polls`, {
          method: "POST",
          body: JSON.stringify({ question: pollQuestion, options }),
        });
        setPollOpen(false);
        setPollQuestion("");
        setPollOptions("Yes\nNo");
        setFeedback(null);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to create the poll.");
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
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to register the vote.");
      }
    });
  }

  async function handleAcceptOffer(offerId: string) {
    try {
      const updated = await apiFetchWithAuth<Offer>(`/offers/${offerId}/accept`, {
        method: "POST",
      });
      setOffers((c) => upsertOffer(c, updated));
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
      setFeedback(err instanceof Error ? err.message : "Could not reject the offer.");
    }
  }

  async function handleCounterOffer(offerId: string, payload: CounterOfferPayload) {
    const updated = await apiFetchWithAuth<Offer>(`/offers/${offerId}/counter`, {
      method: "POST",
      body: JSON.stringify({
        pricePerPerson: payload.price,
        message: payload.message,
        requestedAdditions: payload.requestedAdditions,
      }),
    });
    setOffers((c) => upsertOffer(c, updated));
  }

  async function handleWithdrawOffer(offerId: string) {
    try {
      const updated = await apiFetchWithAuth<Offer>(`/offers/${offerId}/withdraw`, {
        method: "POST",
      });
      setOffers((c) => upsertOffer(c, updated));
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Could not withdraw the offer.");
    }
  }


  const counteringOffer = counterSheetOfferId ? offers.find((o) => o.id === counterSheetOfferId) : null;
  const isCreator = planCreatorId ? userId === planCreatorId : true;

  if (loading) {
    return (
      <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
        <div className="animate-pulse-soft text-center">
          <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
          <p className="text-sm">Loading group chat...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
        {/* Chat area */}
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
                  {/* View all offers badge */}
                  {offers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        document.getElementById("offers-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="flex items-center gap-1.5 rounded-full bg-[var(--color-lavender-50)] border border-[var(--color-lavender-200)] px-3 py-1.5 text-xs font-semibold text-[var(--color-lavender-500)] hover:bg-[var(--color-lavender-100)] transition-colors"
                    >
                      <Receipt className="size-3.5" />
                      View all offers ({offers.length})
                    </button>
                  )}
                  <Button variant="soft" size="sm" onClick={() => setPollOpen(true)}>
                    <PlusCircle className="size-4" />
                    Start poll
                  </Button>
                </div>
              </div>

              {feedback && (
                <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)]">
                  {feedback}
                </div>
              )}

              {/* Messages */}
              <div className="max-h-[calc(100dvh-220px)] sm:max-h-[60vh] space-y-3 overflow-y-auto hide-scrollbar">
                {messages.length === 0 ? (
                  <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
                    No messages yet. Coordinate arrivals, budget, and votes here.
                  </CardInset>
                ) : (
                  messages.map((message) => {
                    const mine = session?.user.id === message.senderId;
                    const pollOptionsData = message.metadata?.options ?? [];
                    const pollQuestion = typeof message.metadata?.question === "string" ? message.metadata.question : message.content;

                    if (message.messageType === "system") {
                      // Detect offer-related system messages by metadata
                      const metaAction = message.metadata &&
                        typeof message.metadata === "object" &&
                        "action" in message.metadata
                        ? String((message.metadata as Record<string, unknown>).action)
                        : "";
                      const isOfferMsg = metaAction.startsWith("offer_");
                      const isPaymentMsg = metaAction.startsWith("payment_");

                      return (
                        <div
                          key={message.id}
                          className={`mx-auto flex max-w-md items-center gap-2 rounded-full px-4 py-2 text-center text-xs ${
                            isOfferMsg
                              ? "bg-[var(--color-lavender-50)] border border-[var(--color-lavender-200)] text-[var(--color-lavender-500)]"
                              : isPaymentMsg
                              ? "bg-[var(--color-sea-50)] border border-[var(--color-sea-200)] text-[var(--color-sea-700)]"
                              : "bg-[var(--color-surface-2)] text-[var(--color-ink-500)]"
                          }`}
                        >
                          {isOfferMsg && <Receipt className="size-3.5 shrink-0" />}
                          <span>{message.content}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-[var(--radius-lg)] px-4 py-3 sm:px-5 sm:py-4 ${
                            mine
                              ? "bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-white shadow-[var(--shadow-sm)]"
                              : "border border-white/60 bg-[var(--color-surface-raised)] text-[var(--color-ink-900)] shadow-[var(--shadow-md)]"
                          }`}
                        >
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em]">
                            <span className="font-semibold">{message.sender?.fullName ?? "System"}</span>
                            <span className={mine ? "text-white/60" : "text-[var(--color-ink-400)]"}>
                              {formatCompactDate(message.createdAt)}
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
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Typing indicators */}
              {typingUsers.length > 0 ? (
                <p className="text-xs text-[var(--color-ink-500)]">
                  {typingUsers.map((entry) => entry.fullName).join(", ")}{" "}
                  {typingUsers.length === 1 ? "is" : "are"} typing...
                </p>
              ) : null}

              {/* Compose — sticky on mobile */}
              <div className="sticky bottom-0 -mx-5 -mb-5 bg-white/95 backdrop-blur-sm px-5 py-3 border-t border-[var(--color-border)] sm:static sm:mx-0 sm:mb-0 sm:bg-transparent sm:backdrop-blur-none sm:px-0 sm:py-0 sm:border-0">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message... (⌘Enter to send)"
                      rows={2}
                      className="min-h-0"
                    />
                  </div>
                  <div className="flex flex-col gap-2 self-end shrink-0">
                    {isAgency && (
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => setOfferModalOpen(true)}
                        title="Submit an offer"
                        className="flex items-center gap-1.5"
                      >
                        <Receipt className="size-4" />
                        <span className="hidden sm:inline">Submit Offer</span>
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

          {/* ── Inline Offer Cards (Phase 4) ── */}
          {offers.length > 0 && (
            <div id="offers-section" className="space-y-4 scroll-mt-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg text-[var(--color-ink-950)]">
                  Offers ({offers.length})
                </h3>
                <span className="text-xs text-[var(--color-ink-500)]">
                  {offers.filter((o) => o.status === "ACCEPTED").length} accepted ·{" "}
                  {offers.filter((o) => o.status === "PENDING").length} pending
                </span>
              </div>
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  isCreator={isCreator}
                  isAgency={isAgency}
                  onAccept={handleAcceptOffer}
                  onCounter={(offerId) => setCounterSheetOfferId(offerId)}
                  onReject={handleRejectOffer}
                  onWithdraw={handleWithdrawOffer}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Room</p>
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
                  <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-xs font-bold text-[var(--color-sea-700)]">
                    {initials(member.user.fullName)}
                  </div>
                  <div className="min-w-0">
                    {member.user.username ? (
                      <Link href={`/profile/${member.user.username}`} className="truncate text-sm font-medium text-[var(--color-ink-900)] transition hover:text-[var(--color-sea-700)]">
                        {member.user.fullName}
                      </Link>
                    ) : (
                      <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{member.user.fullName}</p>
                    )}
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">{member.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <CardInset className="flex items-start gap-3 p-4 text-sm text-[var(--color-ink-600)]">
            <MessageSquareMore className="size-4 shrink-0 text-[var(--color-sea-600)] mt-0.5" />
            <span>Messages and polls update live. Keep this tab open while coordinating.</span>
          </CardInset>
        </div>
      </div>

      {/* ── Poll modal ── */}
      <Modal
        open={pollOpen}
        onClose={() => setPollOpen(false)}
        title="Start a quick poll"
        description="Departure times, activity choices, or rooming decisions."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Question</label>
            <Input value={pollQuestion} onChange={(e) => setPollQuestion(e.target.value)} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Options (one per line)</label>
            <Textarea value={pollOptions} onChange={(e) => setPollOptions(e.target.value)} rows={4} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setPollOpen(false)}>Cancel</Button>
            <Button onClick={createPoll} disabled={isPending}>
              {isPending ? "Publishing..." : "Create poll"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Submit Offer modal (agency only) ── */}
      <SubmitOfferModal
        open={offerModalOpen}
        groupId={groupId}
        planCreatorId={planCreatorId}
        onClose={() => setOfferModalOpen(false)}
        onSubmitted={(offer) => setOffers((c) => upsertOffer(c, offer))}
        apiFetchWithAuth={apiFetchWithAuth}
      />

      {/* ── Counter Offer sheet ── */}
      <CounterOfferSheet
        open={counterSheetOfferId !== null}
        onClose={() => setCounterSheetOfferId(null)}
        onSubmit={async (payload) => {
          if (!counterSheetOfferId) return;
          await handleCounterOffer(counterSheetOfferId, payload);
        }}
        currentPrice={counteringOffer?.pricePerPerson ?? 0}
        counterRound={(counteringOffer?.negotiations?.length ?? 0) + 1}
        maxRounds={3}
      />
    </>
  );
}
