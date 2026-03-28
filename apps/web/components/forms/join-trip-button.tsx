"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";

export function JoinTripButton({
  groupId,
  label = "Join this trip",
  requiresFemaleProfile = false,
}: {
  groupId?: string;
  label?: string;
  requiresFemaleProfile?: boolean;
}) {
  const { session, apiFetchWithAuth } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
              await apiFetchWithAuth(`/groups/${groupId}/join`, { method: "POST" });
              setFeedback("You have been added to the group.");
            } catch (error) {
              setFeedback(error instanceof Error ? error.message : "Unable to join right now.");
            }
          })
        }
        disabled={isPending}
      >
        <UserPlus className="size-4" />
        {isPending ? "Joining..." : label}
      </Button>
      {feedback && (
        <p className={`text-sm ${feedback.includes("added") ? "text-[var(--color-sea-700)]" : "text-[var(--color-sunset-700)]"}`}>
          {feedback}
        </p>
      )}
    </div>
  );
}
