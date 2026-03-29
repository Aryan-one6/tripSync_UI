"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MessageSquareMore, PlusCircle, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCompactDate, initials } from "@/lib/format";
import { useSocket } from "@/lib/realtime/use-socket";
import type { ChatMessage, Group, GroupMember } from "@/lib/api/types";

function upsertMessage(list: ChatMessage[], next: ChatMessage) {
  const existingIndex = list.findIndex((message) => message.id === next.id);
  if (existingIndex === -1) {
    return [...list, next].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
  const clone = [...list];
  clone[existingIndex] = next;
  return clone;
}

export function GroupChat({ groupId }: { groupId: string }) {
  const { session, apiFetchWithAuth } = useAuth();
  const socket = useSocket();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("Yes\nNo");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; fullName: string }>>([]);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        await Promise.all([loadMembers(), loadMessages()]);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to load the trip chat.");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMembers, loadMessages]);

  useEffect(() => {
    if (!socket) return;
    const handleMessageCreated = (message: ChatMessage) => setMessages((c) => upsertMessage(c, message));
    const handleMessageUpdated = (message: ChatMessage) => setMessages((c) => upsertMessage(c, message));
    const handleMemberUpdate = () => void loadMembers();
    const handleTyping = (payload: {
      groupId?: string;
      userId?: string;
      fullName?: string;
      isTyping?: boolean;
    }) => {
      if (payload.groupId !== groupId) return;
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

    socket.emit("group:subscribe", groupId);
    socket.on("chat:message_created", handleMessageCreated);
    socket.on("chat:message_updated", handleMessageUpdated);
    socket.on("group:member_updated", handleMemberUpdate);
    socket.on("chat:typing", handleTyping);

    return () => {
      socket.emit("group:unsubscribe", groupId);
      socket.off("chat:message_created", handleMessageCreated);
      socket.off("chat:message_updated", handleMessageUpdated);
      socket.off("group:member_updated", handleMemberUpdate);
      socket.off("chat:typing", handleTyping);
    };
  }, [groupId, loadMembers, session?.user.id, socket]);

  useEffect(() => {
    if (!socket) return;
    const nextDraft = draft.trim();

    if (!nextDraft) {
      if (isTypingRef.current) {
        emitTyping(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      return;
    }

    if (!isTypingRef.current) {
      emitTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1400);
  }, [draft, emitTyping, socket]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        emitTyping(false);
      }
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
    <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
      {/* Chat area */}
      <div className="space-y-5">
        <Card className="relative overflow-hidden p-5 sm:p-6">
          {/* Blob decoration */}

          <div className="relative space-y-5">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                  Live coordination
                </span>
                <h2 className="mt-2 font-display text-xl text-[var(--color-ink-950)] sm:text-2xl">
                  Group chat & polls
                </h2>
              </div>
              <Button variant="soft" size="sm" onClick={() => setPollOpen(true)}>
                <PlusCircle className="size-4" />
                Start poll
              </Button>
            </div>

            {feedback && (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
                {feedback}
              </div>
            )}

            {/* Messages */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto hide-scrollbar">
              {messages.length === 0 ? (
                <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
                  No messages yet. Coordinate arrivals, budget, and votes here.
                </CardInset>
              ) : (
                messages.map((message) => {
                  const mine = session?.user.id === message.senderId;
                  const pollOptionsData = message.metadata?.options ?? [];

                  if (message.messageType === "system") {
                    return (
                      <div key={message.id} className="mx-auto max-w-md rounded-full bg-[var(--color-surface-2)] px-4 py-2 text-center text-xs text-[var(--color-ink-500)] shadow-[var(--shadow-clay-inset)]">
                        {message.content}
                      </div>
                    );
                  }

                  return (
                    <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-[var(--radius-lg)] px-4 py-3 sm:px-5 sm:py-4 ${
                          mine
                            ? "bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-white shadow-[var(--shadow-clay-sea)]"
                            : "border border-white/60 bg-[var(--color-surface-raised)] text-[var(--color-ink-900)] shadow-[var(--shadow-clay)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em]">
                          <span className="font-semibold">{message.sender?.fullName ?? "System"}</span>
                          <span className={mine ? "text-white/60" : "text-[var(--color-ink-400)]"}>
                            {formatCompactDate(message.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>

                        {message.messageType === "poll" && (
                          <div className="mt-3 grid gap-2">
                            {pollOptionsData.map((option) => {
                              const voted = option.votes.includes(session?.user.id ?? "");
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => vote(message.id, option.id)}
                                  className={`rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-sm transition-all ${
                                    mine ? "bg-white/15 hover:bg-white/25" : "bg-[var(--color-surface-2)] hover:bg-[var(--color-sea-50)]"
                                  } ${voted ? "ring-2 ring-[var(--color-sea-400)]" : ""}`}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span>{option.label}</span>
                                    <span className="text-xs opacity-70">{option.votes.length}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Compose */}
            {typingUsers.length > 0 ? (
              <p className="text-xs text-[var(--color-ink-500)]">
                {typingUsers.map((entry) => entry.fullName).join(", ")}{" "}
                {typingUsers.length === 1 ? "is" : "are"} typing...
              </p>
            ) : null}

            <div className="flex gap-3">
              <div className="flex-1">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  rows={2}
                  className="min-h-0"
                />
              </div>
              <Button onClick={sendMessage} disabled={isPending} size="icon" className="self-end shrink-0">
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
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
              <div key={member.id} className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-3 py-2.5 shadow-[var(--shadow-clay-inset)]">
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

      {/* Poll modal */}
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
    </div>
  );
}
