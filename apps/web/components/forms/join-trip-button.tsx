"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import type { GroupMember, MemberStatus } from "@/lib/api/types";

export function JoinTripButton({
  groupId,
  label = "Join this trip",
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

  const joinedLabel =
    isCreator
      ? "You host this trip"
      : joinedStatus === "INTERESTED"
        ? "Request pending"
        : joinedStatus === "COMMITTED"
          ? "Trip confirmed"
          : joinedStatus === "APPROVED"
            ? "Already joined"
            : label;

  if (!groupId) {
    return (
      <Button type="button" disabled className="gap-2">
        Group unavailable
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="gap-2 whitespace-nowrap"
        onClick={() =>
          startTransition(async () => {
            try {
              if (requiresFemaleProfile && session && session.user.gender !== "female") {
                setFeedback("This group is female-only. Set your profile gender to female to join.");
                return;
              }
              const member = await apiFetchWithAuth<GroupMember>(`/groups/${groupId}/join`, { method: "POST" });
              setOptimisticStatus(member.status);
              setFeedback(
                member.status === "INTERESTED"
                  ? "Join request sent. The creator will approve you soon."
                  : "You have been added to the group.",
              );
              router.refresh();
            } catch (error) {
              setFeedback(error instanceof Error ? error.message : "Unable to join right now.");
            }
          })
        }
        disabled={isPending || !!joinedStatus}
      >
        <UserPlus className="size-4" />
        {isPending ? "Joining..." : joinedLabel}
      </Button>
      {feedback && (
        <p className={`text-sm ${feedback.includes("added") || feedback.includes("sent") ? "text-[var(--color-sea-700)]" : "text-[var(--color-sunset-700)]"}`}>
          {feedback}
        </p>
      )}
    </div>
  );
}
