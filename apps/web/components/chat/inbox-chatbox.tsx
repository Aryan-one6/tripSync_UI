"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare, Send, Users } from "lucide-react";
import { Card, CardInset } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/auth-context";
import { useSocket } from "@/lib/realtime/use-socket";
import { formatCompactDate, formatDateRange, initials } from "@/lib/format";
import type {
  DirectConversation,
  DirectMessage,
  TripMembership,
  UserSummary,
} from "@/lib/api/types";

function upsertDirectMessage(list: DirectMessage[], next: DirectMessage) {
  const existingIndex = list.findIndex((message) => message.id === next.id);
  if (existingIndex === -1) {
    return [...list, next].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
  const clone = [...list];
  clone[existingIndex] = next;
  return clone;
}

function sortByUpdatedAtDesc(list: DirectConversation[]) {
  return [...list].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function previewLastMessage(content?: string | null) {
  if (!content) return "No messages yet";
  return content.length > 60 ? `${content.slice(0, 57)}...` : content;
}

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

export function InboxChatbox({ variant }: { variant: "user" | "agency" }) {
  const searchParams = useSearchParams();
  const { session, apiFetchWithAuth } = useAuth();
  const socket = useSocket();

  const targetUserId = searchParams.get("userId");
  const initialConversationId = searchParams.get("conversationId");

  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [groupChannels, setGroupChannels] = useState<TripMembership[]>([]);
  const [messageableContacts, setMessageableContacts] = useState<MessageableContact[]>([]);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; fullName: string }>>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isPending, startTransition] = useTransition();

  const routeIntentHandledRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, conversations],
  );

  const activeGroupChannels = useMemo(
    () =>
      groupChannels.filter((trip) => {
        // Show group chat for approved or committed members in any active trip
        const memberActive = trip.status === "APPROVED" || trip.status === "COMMITTED";
        const tripStatus = trip.group.plan?.status ?? trip.group.package?.status;
        const channelOpen = !tripStatus || (tripStatus !== "CANCELLED" && tripStatus !== "EXPIRED");
        return memberActive && channelOpen;
      }),
    [groupChannels],
  );

  const conversationByCounterpartId = useMemo(() => {
    const entries = conversations
      .filter((conversation) => Boolean(conversation.counterpart?.id))
      .map((conversation) => [conversation.counterpart!.id, conversation] as const);
    return new Map(entries);
  }, [conversations]);

  const openOrCreateConversation = useCallback(
    async (userId: string) => {
      if (userId === session?.user.id) {
        setFeedback("You cannot start a conversation with yourself.");
        return;
      }

      const existing = conversations.find((conversation) => conversation.counterpart?.id === userId);
      if (existing) {
        setActiveConversationId(existing.id);
        setFeedback(null);
        return;
      }

      try {
        const created = await apiFetchWithAuth<DirectConversation>("/chat/direct/conversations", {
          method: "POST",
          body: JSON.stringify({ targetUserId: userId }),
        });
        setConversations((current) => sortByUpdatedAtDesc([created, ...current]));
        setActiveConversationId(created.id);
        setFeedback(null);
      } catch (error) {
        setFeedback(
          error instanceof Error ? error.message : "Unable to start a new conversation with this user.",
        );
      }
    },
    [apiFetchWithAuth, conversations, session?.user.id],
  );

  async function markConversationRead(conversationId: string) {
    await apiFetchWithAuth(`/chat/direct/conversations/${conversationId}/read`, {
      method: "POST",
    });
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unreadCount: 0, lastReadAt: new Date().toISOString() }
          : conversation,
      ),
    );
  }

  const emitDirectTyping = (isTyping: boolean) => {
    if (!socket || !activeConversationId) return;
    socket.emit("direct:typing", { conversationId: activeConversationId, isTyping });
    isTypingRef.current = isTyping;
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoadingConversations(true);
        // Load DM conversations (returns [] gracefully if not yet eligible)
        const data = await apiFetchWithAuth<DirectConversation[]>("/chat/direct/conversations").catch(() => [] as DirectConversation[]);
        setConversations(sortByUpdatedAtDesc(data));
      } finally {
        // Always load group channels separately so a DM error doesn't block trips
        if (variant === "user") {
          try {
            const trips = await apiFetchWithAuth<TripMembership[]>("/groups/my");
            setGroupChannels(trips);
          } catch {
            // non-fatal: group channels just won't show
          }
        }
        setLoadingConversations(false);
      }
    })();
  }, [apiFetchWithAuth, variant]);

  useEffect(() => {
    if (variant !== "user" || !session?.user.id) {
      setMessageableContacts([]);
      return;
    }

    if (activeGroupChannels.length === 0) {
      setMessageableContacts([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setLoadingContacts(true);
        const groups = await Promise.all(
          activeGroupChannels.map((trip) =>
            apiFetchWithAuth<GroupMembersResponse>(`/groups/${trip.group.id}/members`).catch(
              () => null,
            ),
          ),
        );

        if (cancelled) return;

        const next = new Map<string, MessageableContact>();
        for (const groupData of groups) {
          if (!groupData) continue;
          for (const member of groupData.members) {
            if (member.status !== "APPROVED" && member.status !== "COMMITTED") continue;
            if (!member.user.id || member.user.id === session.user.id) continue;

            const current = next.get(member.user.id);
            if (current) {
              if (!current.sharedGroupIds.includes(groupData.group.id)) {
                current.sharedGroupIds.push(groupData.group.id);
              }
            } else {
              next.set(member.user.id, {
                user: member.user,
                sharedGroupIds: [groupData.group.id],
              });
            }
          }
        }

        const sorted = Array.from(next.values()).sort((left, right) => {
          if (right.sharedGroupIds.length !== left.sharedGroupIds.length) {
            return right.sharedGroupIds.length - left.sharedGroupIds.length;
          }
          return left.user.fullName.localeCompare(right.user.fullName);
        });
        setMessageableContacts(sorted);
      } finally {
        if (!cancelled) {
          setLoadingContacts(false);
        }
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
        const existing = conversations.find((conversation) => conversation.id === initialConversationId);
        if (existing) {
          setActiveConversationId(existing.id);
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
  }, [conversations, initialConversationId, loadingConversations, openOrCreateConversation, targetUserId]);

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
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to load conversation messages.");
      } finally {
        setLoadingMessages(false);
      }
    })();
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

    const handleDirectMessageCreated = (payload: {
      conversationId?: string;
      message?: DirectMessage;
    }) => {
      if (!payload.conversationId || !payload.message) return;
      const conversationId = payload.conversationId;
      const message = payload.message;
      const conversationKnown = conversations.some((conversation) => conversation.id === conversationId);

      setConversations((current) => {
        const next = current.map((conversation) => {
          if (conversation.id !== conversationId) return conversation;
          if (conversation.lastMessage?.id === message.id) return conversation;

          const isMine = message.senderId === session?.user.id;
          const isActive = conversationId === activeConversationId;

          return {
            ...conversation,
            updatedAt: message.createdAt,
            lastMessage: message,
            unreadCount: isMine || isActive ? 0 : conversation.unreadCount + 1,
          };
        });

        return sortByUpdatedAtDesc(next);
      });

      if (!conversationKnown) {
        void (async () => {
          const refreshed = await apiFetchWithAuth<DirectConversation[]>(
            "/chat/direct/conversations",
          ).catch(() => [] as DirectConversation[]);
          setConversations(sortByUpdatedAtDesc(refreshed));
        })();
      }

      if (conversationId === activeConversationId) {
        setMessages((current) => upsertDirectMessage(current, message));
        if (message.senderId !== session?.user.id) {
          void markConversationRead(conversationId);
        }
      }
    };

    const handleDirectTyping = (payload: {
      conversationId?: string;
      userId?: string;
      fullName?: string;
      isTyping?: boolean;
    }) => {
      if (payload.conversationId !== activeConversationId) return;
      if (!payload.userId || payload.userId === session?.user.id) return;
      const userId = payload.userId;
      const fullName = payload.fullName ?? "Someone";
      const isTyping = Boolean(payload.isTyping);

      setTypingUsers((current) => {
        if (isTyping) {
          if (current.some((entry) => entry.userId === userId)) {
            return current;
          }
          return [...current, { userId, fullName }];
        }
        return current.filter((entry) => entry.userId !== userId);
      });
    };

    socket.on("direct:message_created", handleDirectMessageCreated);
    socket.on("direct:typing", handleDirectTyping);

    return () => {
      socket.off("direct:message_created", handleDirectMessageCreated);
      socket.off("direct:typing", handleDirectTyping);
    };
  }, [activeConversationId, apiFetchWithAuth, conversations, session?.user.id, socket]);

  useEffect(() => {
    if (!socket || !activeConversationId) return;
    const trimmed = draft.trim();

    if (!trimmed) {
      if (isTypingRef.current) {
        emitDirectTyping(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      return;
    }

    if (!isTypingRef.current) {
      emitDirectTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitDirectTyping(false);
    }, 1400);
  }, [activeConversationId, draft, socket]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        emitDirectTyping(false);
      }
    };
  }, []);

  function sendDirectMessage() {
    if (!activeConversationId) return;
    const content = draft.trim();
    if (!content) return;

    startTransition(async () => {
      try {
        await apiFetchWithAuth(`/chat/direct/conversations/${activeConversationId}/messages`, {
          method: "POST",
          body: JSON.stringify({ content }),
        });
        setDraft("");
        setFeedback(null);
        emitDirectTyping(false);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to send direct message.");
      }
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[330px_1fr]">
      <div className="space-y-5">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Inbox
              </p>
              <h2 className="mt-1 font-display text-lg text-[var(--color-ink-950)]">Direct conversations</h2>
            </div>
            <MessageSquare className="size-4 text-[var(--color-sea-600)]" />
          </div>

          {loadingConversations ? (
            <p className="text-sm text-[var(--color-ink-500)]">Loading conversations...</p>
          ) : conversations.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              description={
                variant === "agency"
                  ? "Open a traveler profile from bids or referrals and start the first message."
                  : "Start with a traveler or agency tied to your active trip flow."
              }
            />
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const isActive = conversation.id === activeConversationId;
                const name = conversation.counterpart?.fullName ?? "Unknown";
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => {
                      setActiveConversationId(conversation.id);
                      setTypingUsers([]);
                    }}
                    className={`w-full rounded-[var(--radius-md)] border px-3 py-3 text-left transition ${
                      isActive
                        ? "border-[var(--color-sea-200)] bg-[var(--color-sea-50)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-sea-100)] hover:bg-[var(--color-surface-2)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-xs font-bold text-[var(--color-sea-700)]">
                        {initials(name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">{name}</p>
                          {conversation.unreadCount > 0 ? (
                            <span className="rounded-full bg-[var(--color-sea-600)] px-2 py-0.5 text-[10px] font-bold text-white">
                              {conversation.unreadCount}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-xs text-[var(--color-ink-500)]">
                          {previewLastMessage(conversation.lastMessage?.content)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          </Card>

        {variant === "user" ? (
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-sea-50)] text-[var(--color-sea-700)]">
                <Users className="size-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                  Group Channels
                </p>
                <p className="font-display text-base text-[var(--color-ink-950)]">Trip chats</p>
              </div>
            </div>

            {activeGroupChannels.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-500)]">
                Join and get approved for a trip to access group channels.
              </p>
            ) : (
              <div className="space-y-2">
                {activeGroupChannels.map((trip) => {
                  const title = trip.group.plan?.title ?? trip.group.package?.title ?? "Trip group";
                  const destination =
                    trip.group.plan?.destination ?? trip.group.package?.destination ?? "Destination";
                  return (
                    <Link
                      key={trip.id}
                      href={`/dashboard/groups/${trip.group.id}/chat`}
                      className="block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-3 text-sm transition hover:border-[var(--color-sea-100)] hover:bg-[var(--color-surface-2)]"
                    >
                      <p className="truncate font-semibold text-[var(--color-ink-900)]">{title}</p>
                      <p className="mt-1 text-xs text-[var(--color-ink-500)]">
                        {destination} • {formatDateRange(trip.group.plan?.startDate, trip.group.plan?.endDate)}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="mt-4 border-t border-[var(--color-border)] pt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Travelers You Can Message
              </p>
              {loadingContacts ? (
                <p className="mt-2 text-sm text-[var(--color-ink-500)]">Loading travelers...</p>
              ) : messageableContacts.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--color-ink-500)]">
                  Once your trip has approved co-travelers, they will appear here for direct chat.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {messageableContacts.map((contact) => {
                    const conversation = conversationByCounterpartId.get(contact.user.id);
                    return (
                      <button
                        key={contact.user.id}
                        type="button"
                        onClick={() => {
                          void openOrCreateConversation(contact.user.id);
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-2.5 text-left transition hover:border-[var(--color-sea-100)] hover:bg-[var(--color-surface-2)]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
                            {contact.user.fullName}
                          </p>
                          <p className="text-xs text-[var(--color-ink-500)]">
                            Shared trip{contact.sharedGroupIds.length > 1 ? "s" : ""}:{" "}
                            {contact.sharedGroupIds.length}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-[var(--color-sea-700)]">
                          {conversation ? "Open chat" : "Start chat"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        ) : null}
      </div>

      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="relative flex h-full min-h-[68vh] flex-col">
          {feedback ? (
            <div className="mb-4 rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
              {feedback}
            </div>
          ) : null}

          {!activeConversation ? (
            <EmptyState
              title="Choose a conversation"
              description="Select a chat from the inbox on the left to open the full messenger view."
            />
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-sm font-bold text-[var(--color-sea-700)]">
                  {initials(activeConversation.counterpart?.fullName ?? "Unknown")}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg text-[var(--color-ink-950)]">
                    {activeConversation.counterpart?.fullName ?? "Unknown"}
                  </p>
                  <p className="text-xs text-[var(--color-ink-500)]">
                    {typingUsers.length > 0
                      ? `${typingUsers.map((entry) => entry.fullName).join(", ")} typing...`
                      : "Realtime direct messaging"}
                  </p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {loadingMessages ? (
                  <p className="text-sm text-[var(--color-ink-500)]">Loading messages...</p>
                ) : messages.length === 0 ? (
                  <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
                    No messages yet. Say hello and start the thread.
                  </CardInset>
                ) : (
                  messages.map((message) => {
                    const mine = message.senderId === session?.user.id;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-[var(--radius-lg)] px-4 py-3 text-sm ${
                            mine
                              ? "bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-white shadow-[var(--shadow-clay-sea)]"
                              : "border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink-900)] shadow-[var(--shadow-clay)]"
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          <p className={`mt-1.5 text-[10px] ${mine ? "text-white/70" : "text-[var(--color-ink-500)]"}`}>
                            {formatCompactDate(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <div className="mt-4 flex gap-3 border-t border-[var(--color-border)] pt-4">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Type your message..."
                  rows={2}
                  className="min-h-0 flex-1"
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={sendDirectMessage}
                  disabled={isPending || !draft.trim()}
                  className="shrink-0 self-end"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
