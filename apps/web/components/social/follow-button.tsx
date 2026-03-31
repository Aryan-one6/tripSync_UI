"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FollowState } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";

interface FollowButtonProps {
  handle: string;
  state: FollowState;
  onChange: (state: FollowState) => void;
  size?: "sm" | "default";
}

export function FollowButton({ handle, state, onChange, size = "default" }: FollowButtonProps) {
  const router = useRouter();
  const { status, apiFetchWithAuth } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isHoveringFollow, setIsHoveringFollow] = useState(false);

  if (state.isOwnProfile) {
    return null;
  }

  const handleClick = () => {
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
          setIsHoveringFollow(false);
        })
        .catch(() => undefined);
    });
  };

  if (state.isFollowing) {
    return (
      <Button
        variant={isHoveringFollow ? "danger" : "secondary"}
        size={size}
        onClick={handleClick}
        disabled={isPending}
        onMouseEnter={() => setIsHoveringFollow(true)}
        onMouseLeave={() => setIsHoveringFollow(false)}
        className="min-w-28 transition-all duration-200"
      >
        {isPending ? (
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isHoveringFollow ? (
          <UserMinus className="size-4" />
        ) : (
          <UserCheck className="size-4" />
        )}
        {isPending ? "Updating..." : isHoveringFollow ? "Unfollow" : "Following"}
      </Button>
    );
  }

  return (
    <Button
      variant="primary"
      size={size}
      onClick={handleClick}
      disabled={isPending}
      className="min-w-28"
    >
      {isPending ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <UserPlus className="size-4" />
      )}
      {isPending ? "Updating..." : "Follow"}
    </Button>
  );
}
