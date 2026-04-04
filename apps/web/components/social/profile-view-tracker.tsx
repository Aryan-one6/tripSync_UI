"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth/auth-context";

export function ProfileViewTracker({ handle }: { handle: string }) {
  const { session, status, apiFetchWithAuth } = useAuth();
  const trackedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const viewerHandle = session.user.username?.toLowerCase();
    if (viewerHandle && viewerHandle === handle.toLowerCase()) return;

    const key = `${session.user.id}:${handle.toLowerCase()}`;
    if (trackedKeyRef.current === key) return;
    trackedKeyRef.current = key;

    void apiFetchWithAuth<{ recorded: boolean }>(
      `/social/profiles/${encodeURIComponent(handle)}/view`,
      { method: "POST" },
    ).catch(() => undefined);
  }, [apiFetchWithAuth, handle, session?.user?.id, session?.user?.username, status]);

  return null;
}
