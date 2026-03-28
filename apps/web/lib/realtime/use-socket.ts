"use client";

import { useEffect, useSyncExternalStore } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth/auth-context";

const socketListeners = new Set<() => void>();
let cachedSocket: Socket | null = null;
let cachedToken: string | null = null;

function notifySocketListeners() {
  for (const listener of socketListeners) {
    listener();
  }
}

function subscribeToSocket(listener: () => void) {
  socketListeners.add(listener);
  return () => {
    socketListeners.delete(listener);
  };
}

function readSocket() {
  return cachedSocket;
}

function ensureSocket(token: string | null) {
  if (!SOCKET_URL || !token) {
    cachedSocket?.disconnect();
    cachedToken = token;
    cachedSocket = null;
    notifySocketListeners();
    return;
  }

  if (cachedToken === token && cachedSocket) {
    return;
  }

  cachedSocket?.disconnect();
  cachedToken = token;
  cachedSocket = io(SOCKET_URL, {
    transports: ["websocket"],
    auth: { token },
  });

  notifySocketListeners();
}

export function useSocket() {
  const { session } = useAuth();
  const token = session?.accessToken ?? null;
  const socket = useSyncExternalStore(subscribeToSocket, readSocket, () => null);

  useEffect(() => {
    ensureSocket(token);
  }, [token]);

  return socket;
}
