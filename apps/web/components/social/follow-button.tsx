"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FollowState } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";

interface FollowButtonProps {
  handle: string;
  state: FollowState;
  onChange: (state: FollowState) => void;
}

export function FollowButton({ handle, state, onChange }: FollowButtonProps) {
  const router = useRouter();
  const { status, apiFetchWithAuth } = useAuth();
  const [isPending, startTransition] = useTransition();

  if (state.isOwnProfile) {
    return null;
  }

  const label = state.isFollowing ? "Following" : "Follow";

  return (
    <Button
      variant={state.isFollowing ? "secondary" : "primary"}
      onClick={() => {
        if (status !== "authenticated") {
          router.push(`/login?next=${encodeURIComponent(`/profile/${handle}`)}`);
          return;
        }

        startTransition(() => {
          void apiFetchWithAuth<FollowState>(`/social/profiles/${encodeURIComponent(handle)}/follow`, {
            method: state.isFollowing ? "DELETE" : "POST",
          })
            .then((nextState) => {
              onChange(nextState);
            })
            .catch(() => undefined);
        });
      }}
      disabled={isPending}
      className="min-w-28"
    >
      {state.isFollowing ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
      {isPending ? "Updating..." : label}
    </Button>
  );
}
