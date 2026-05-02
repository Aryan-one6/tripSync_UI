"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Ticket, MessageSquareMore, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import type { GroupMember, MemberStatus } from "@/lib/api/types";

export function JoinTripButton({
  groupId,
  label = "Book Now",
  requiresFemaleProfile = false,
  members = [],
}: {
  groupId?: string;
  label?: string;
  requiresFemaleProfile?: boolean;
  members?: GroupMember[];
}) {
  const router = useRouter();
  const { session, apiFetchWithAuth } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<MemberStatus | null>(null);
  const [isPending, startTransition] = useTransition();

  const existingMembership = useMemo(() => {
    if (!session?.user.id) return null;
    return (
      members.find(
        (member) =>
          member.user.id === session.user.id &&
          member.status !== "LEFT" &&
          member.status !== "REMOVED",
      ) ?? null
    );
  }, [members, session?.user.id]);

  const joinedStatus = optimisticStatus ?? existingMembership?.status ?? null;
  const isCreator = existingMembership?.role === "CREATOR";

  if (!groupId) {
    return (
      <Button type="button" disabled className="gap-2">
        Group unavailable
      </Button>
    );
  }

  const checkoutHref = `/dashboard/groups/${groupId}/checkout`;
  const chatHref = `/dashboard/messages?groupId=${encodeURIComponent(groupId)}`;

  // ── Approved / Committed / Creator: open checkout directly ──────────────
  if (isCreator || joinedStatus === "APPROVED" || joinedStatus === "COMMITTED") {
    const heading = isCreator
      ? "You are hosting this trip"
      : joinedStatus === "COMMITTED"
        ? "Trip confirmed — you're in!"
        : "You're approved — complete booking.";
    return (
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-[var(--color-sea-700)]">{heading}</p>
        <Link href={checkoutHref} className="block">
          <Button type="button" className="w-full gap-2">
            <Ticket className="size-4" />
            Book Now
          </Button>
        </Link>
        <Link href={chatHref} className="block">
          <Button type="button" variant="secondary" className="w-full gap-2">
            <MessageSquareMore className="size-4" />
            Go to Group Chat
          </Button>
        </Link>
        {feedback && (
          <p className="text-sm text-[var(--color-sea-700)]">{feedback}</p>
        )}
      </div>
    );
  }

  // ── Pending approval ──────────────────────────────────────────────────────
  if (joinedStatus === "INTERESTED") {
    return (
      <div className="space-y-2">
        <Button type="button" disabled className="gap-2 w-full opacity-75">
          <Clock className="size-4" />
          Request pending approval
        </Button>
        <p className="text-xs text-[var(--color-ink-500)]">
          The creator will approve you soon. You&apos;ll get group chat access once approved.
        </p>
      </div>
    );
  }

  // ── Default: join CTA ─────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="gap-2 whitespace-nowrap w-full"
        onClick={() =>
          startTransition(async () => {
            try {
              if (requiresFemaleProfile && session && session.user.gender !== "female") {
                setFeedback("This group is female-only. Set your profile gender to female to join.");
                return;
              }
              const member = await apiFetchWithAuth<GroupMember>(`/groups/${groupId}/join`, { method: "POST" });
              setOptimisticStatus(member.status);
              if (member.status === "INTERESTED") {
                setFeedback("Join request sent. The creator will approve you soon.");
              } else {
                setFeedback("You're in. Opening checkout...");
                router.push(checkoutHref);
                return;
              }
              router.refresh();
            } catch (error) {
              const message = error instanceof Error ? error.message : "Unable to join right now.";
              if (/already in this group/i.test(message)) {
                setFeedback("You're already in this group. Opening checkout...");
                router.push(checkoutHref);
                return;
              }
              setFeedback(message);
            }
          })
        }
        disabled={isPending}
      >
        <Ticket className="size-4" />
        {isPending ? "Joining..." : label}
      </Button>
      {feedback && (
        <p className={`text-sm ${feedback.includes("added") || feedback.includes("sent") ? "text-[var(--color-sea-700)]" : "text-[var(--color-sunset-700)]"}`}>
          {feedback}
        </p>
      )}
    </div>
  );
}
