"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/lib/realtime/use-socket";

export function GroupRealtimeRefresh({ groupId }: { groupId?: string | null }) {
  const router = useRouter();
  const socket = useSocket();

  useEffect(() => {
    if (!socket || !groupId) return;

    const handleGroupUpdate = (payload: { groupId?: string }) => {
      if (payload.groupId === groupId) {
        router.refresh();
      }
    };

    socket.on("group:member_updated", handleGroupUpdate);
    return () => {
      socket.off("group:member_updated", handleGroupUpdate);
    };
  }, [groupId, router, socket]);

  return null;
}
