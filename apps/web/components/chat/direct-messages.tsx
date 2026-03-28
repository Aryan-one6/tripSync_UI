"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, Send, UserRound } from "lucide-react";
import { Card, CardInset } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCompactDate, initials } from "@/lib/format";
import { useSocket } from "@/lib/realtime/use-socket";
import type { DirectConversation, DirectMessage } from "@/lib/api/types";

function upsertDirectMessage(list: DirectMessage[], next: DirectMessage) {
  const existingIndex = list.findIndex((message) => message.id === next.id);
  if (existingIndex === -1) {
    return [...list, next].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  const clone = [...list];
  clone[existingIndex] = next;
  return clone;
}

export function DirectMessages({
  initialTargetUserId,
  initialConversationId,
}: {
  initialTargetUserId?: string;
  initialConversationId?: string;
}) {
  const router = useRouter();
  const { session, apiFetchWithAuth } = useAuth();
  const socket = useSocket();
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversationId ?? null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const hasBootstrappedTarget = useRef(false);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId],
  );

  const loadConversations = useCallback(async () => {
    const data = await apiFetchWithAuth<DirectConversation[]>("/chat/direct/conversations");
    setConversations(data);
    return data;
  }, [apiFetchWithAuth]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const data = await apiFetchWithAuth<DirectMessage[]>(
        `/chat/direct/conversations/${conversationId}/messages`,
      );
      setMessages(data);
      await apiFetchWithAuth(`/chat/direct/conversations/${conversationId}/read`, {
        method: "POST",
      });
    },
    [apiFetchWithAuth],
  );

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const loadedConversations = await loadConversations();

        if (initialTargetUserId && !hasBootstrappedTarget.current) {
          hasBootstrappedTarget.current = true;
          const created = await apiFetchWithAuth<DirectConversation>("/chat/direct/conversations", {
            method: "POST",
            body: JSON.stringify({ targetUserId: initialTargetUserId }),
          });
          const nextConversations = await loadConversations();
          setSelectedConversationId(created.id);
          router.replace(`/dashboard/messages?conversation=${created.id}`);
          await loadMessages(created.id);
          setConversations(nextConversations);
          return;
        }

        const nextConversationId =
          initialConversationId ??
          selectedConversationId ??
          loadedConversations[0]?.id ??
          null;
        setSelectedConversationId(nextConversationId);

        if (nextConversationId) {
          await loadMessages(nextConversationId);
        } else {
          setMessages([]);
        }
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to load direct messages.");
      } finally {
        setLoading(false);
      }
    })();
  }, [
    initialConversationId,
    initialTargetUserId,
    loadConversations,
    loadMessages,
    router,
    selectedConversationId,
    apiFetchWithAuth,
  ]);

  useEffect(() => {
    if (!socket) return;

    const handleDirectMessage = (payload: { conversationId: string; message: DirectMessage }) => {
      void loadConversations();
      if (payload.conversationId === selectedConversationId) {
        setMessages((current) => upsertDirectMessage(current, payload.message));
      }
    };

    socket.on("direct:message_created", handleDirectMessage);
    return () => {
      socket.off("direct:message_created", handleDirectMessage);
    };
  }, [loadConversations, selectedConversationId, socket]);

  function selectConversation(conversationId: string) {
    startTransition(async () => {
      try {
        setSelectedConversationId(conversationId);
        router.replace(`/dashboard/messages?conversation=${conversationId}`);
        await loadMessages(conversationId);
        setFeedback(null);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to open this conversation.");
      }
    });
  }

  function sendMessage() {
    if (!selectedConversationId) return;
    const content = draft.trim();
    if (!content) return;

    startTransition(async () => {
      try {
        const message = await apiFetchWithAuth<DirectMessage>(
          `/chat/direct/conversations/${selectedConversationId}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ content }),
          },
        );
        setMessages((current) => upsertDirectMessage(current, message));
        setDraft("");
        await loadConversations();
        setFeedback(null);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to send the message.");
      }
    });
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
        <div className="animate-pulse-soft text-center">
          <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
          <p className="text-sm">Loading traveler messages...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
      <Card className="p-0">
        <div className="border-b border-white/60 px-5 py-4">
          <p className="font-display text-lg text-[var(--color-ink-950)]">Conversations</p>
          <p className="mt-1 text-sm text-[var(--color-ink-600)]">
            Travelers you can coordinate with privately.
          </p>
        </div>
        <div className="space-y-1.5 p-3">
          {conversations.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="No direct chats yet"
              description="Open a traveler profile or tap Message from a member card to start one."
            />
          ) : (
            conversations.map((conversation) => {
              const counterpart = conversation.counterpart;
              const isActive = conversation.id === selectedConversationId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => selectConversation(conversation.id)}
                  className={`w-full rounded-[var(--radius-md)] px-4 py-3 text-left transition ${
                    isActive
                      ? "bg-[var(--color-sea-50)] shadow-[var(--shadow-clay-sm)]"
                      : "bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-inset)] hover:bg-[var(--color-surface-raised)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-xs font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                      {counterpart ? initials(counterpart.fullName) : <UserRound className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
                          {counterpart?.fullName ?? "Traveler"}
                        </p>
                        {conversation.unreadCount > 0 ? (
                          <span className="rounded-full bg-[var(--color-sea-600)] px-2 py-0.5 text-[10px] font-bold text-white">
                            {conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--color-ink-600)]">
                        {conversation.lastMessage?.content ?? "No messages yet"}
                      </p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-400)]">
                        {conversation.lastMessage ? formatCompactDate(conversation.lastMessage.createdAt) : "New"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        {selectedConversation ? (
          <>
            <div className="flex items-center gap-3 border-b border-white/60 pb-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-sm font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                {initials(selectedConversation.counterpart?.fullName)}
              </div>
              <div>
                <p className="font-display text-lg text-[var(--color-ink-950)]">
                  {selectedConversation.counterpart?.fullName ?? "Traveler"}
                </p>
                <p className="text-sm text-[var(--color-ink-600)]">
                  {selectedConversation.counterpart?.city ?? "TravellersIn traveler"}
                </p>
              </div>
            </div>

            {feedback ? (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
                {feedback}
              </div>
            ) : null}

            <div className="max-h-[60vh] space-y-3 overflow-y-auto hide-scrollbar">
              {messages.length === 0 ? (
                <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
                  Start the conversation and coordinate before the trip.
                </CardInset>
              ) : (
                messages.map((message) => {
                  const mine = message.senderId === session?.user.id;
                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-[var(--radius-lg)] px-4 py-3 ${
                          mine
                            ? "bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-white shadow-[var(--shadow-clay-sea)]"
                            : "bg-[var(--color-surface-2)] text-[var(--color-ink-900)] shadow-[var(--shadow-clay-inset)]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                        <p className={`mt-2 text-[10px] uppercase tracking-[0.16em] ${mine ? "text-white/70" : "text-[var(--color-ink-400)]"}`}>
                          {formatCompactDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex gap-3">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type a direct message..."
                rows={2}
              />
              <Button onClick={sendMessage} disabled={isPending} size="icon" className="self-end shrink-0">
                <Send className="size-4" />
              </Button>
            </div>
          </>
        ) : (
          <EmptyState
            icon={MessageSquareText}
            title="Pick a conversation"
            description="Select an existing conversation or start one from a traveler profile."
          />
        )}
      </Card>
    </div>
  );
}
