"use client";

import { useEffect, useState } from "react";
import type { FollowState } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { FollowButton } from "@/components/social/follow-button";

interface ProfileFollowPanelProps {
  handle: string;
  followerCount: number;
  followingCount: number;
}

export function ProfileFollowPanel({
  handle,
  followerCount,
  followingCount,
}: ProfileFollowPanelProps) {
  const { status, apiFetchWithAuth } = useAuth();
  const [state, setState] = useState<FollowState>({
    isFollowing: false,
    isOwnProfile: false,
    followerCount,
    followingCount,
  });

  useEffect(() => {
    if (status !== "authenticated") {
      setState((current) => ({
        ...current,
        isFollowing: false,
        isOwnProfile: false,
      }));
      return;
    }

    let active = true;

    void apiFetchWithAuth<FollowState>(`/social/profiles/${encodeURIComponent(handle)}/follow-state`)
      .then((nextState) => {
        if (active) {
          setState(nextState);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [apiFetchWithAuth, handle, status]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-4 py-3 shadow-[var(--shadow-clay-inset)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          Followers
        </p>
        <p className="mt-1 font-display text-xl text-[var(--color-ink-950)]">{state.followerCount}</p>
      </div>
      <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-4 py-3 shadow-[var(--shadow-clay-inset)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          Following
        </p>
        <p className="mt-1 font-display text-xl text-[var(--color-ink-950)]">{state.followingCount}</p>
      </div>
      <FollowButton handle={handle} state={state} onChange={setState} />
    </div>
  );
}
