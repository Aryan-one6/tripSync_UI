"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import type { AuthSession } from "@/lib/api/types";

const STORAGE_KEY = "tripsync.session";
const HYDRATION_SNAPSHOT = true;
const SERVER_HYDRATION_SNAPSHOT = false;
const authListeners = new Set<() => void>();
let cachedSession: AuthSession | null = null;
let hasLoadedSession = false;

type SignupTravelerInput = {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  city: string;
  bio?: string;
  avatarUrl?: string;
};

type SignupAgencyInput = SignupTravelerInput & {
  agencyName: string;
  agencyDescription: string;
  agencyPhone?: string;
  agencyEmail?: string;
  agencyAddress: string;
  agencyCity: string;
  agencyState: string;
  gstin?: string;
  pan?: string;
  tourismLicense?: string;
  specializations: string[];
  destinations: string[];
};

interface AuthContextValue {
  session: AuthSession | null;
  status: "loading" | "guest" | "authenticated";
  isPending: boolean;
  login: (
    identifier: string,
    password: string,
    requestedRole?: "user" | "agency_admin",
  ) => Promise<AuthSession>;
  signupTraveler: (input: SignupTravelerInput) => Promise<void>;
  signupAgency: (input: SignupAgencyInput) => Promise<void>;
  refreshAuthSession: () => Promise<AuthSession | null>;
  switchRole: (role: "user" | "agency_admin") => Promise<AuthSession>;
  updateUser: (user: AuthSession["user"]) => void;
  logout: () => void;
  apiFetchWithAuth: <T>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseSession(raw: string | null) {
  if (!raw) return null;

  const parsed = JSON.parse(raw) as Partial<AuthSession>;
  if (!parsed.user || !parsed.accessToken || !parsed.refreshToken || !parsed.role) {
    return null;
  }

  return {
    ...parsed,
    agencyId:
      parsed.role === "agency_admin"
        ? (parsed.agencyId ?? parsed.user.agency?.id ?? null)
        : null,
    availableRoles: parsed.availableRoles ?? deriveAvailableRoles(parsed.user),
  } as AuthSession;
}

function readSessionFromStorage() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  try {
    return parseSession(raw);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function readSession() {
  if (typeof window === "undefined") return null;

  if (!hasLoadedSession) {
    cachedSession = readSessionFromStorage();
    hasLoadedSession = true;
  }

  return cachedSession;
}

function persistSession(session: AuthSession | null) {
  if (typeof window === "undefined") return;

  cachedSession = session;
  hasLoadedSession = true;

  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  for (const listener of authListeners) {
    listener();
  }
}

function subscribeToSession(listener: () => void) {
  authListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      authListeners.delete(listener);
    };
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      cachedSession = readSessionFromStorage();
      hasLoadedSession = true;
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    authListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function subscribeToHydration() {
  return () => {};
}

function deriveAvailableRoles(user: AuthSession["user"] | null | undefined) {
  if (user?.agency?.id) {
    return ["user", "agency_admin"] as AuthSession["availableRoles"];
  }
  return ["user"] as AuthSession["availableRoles"];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribeToSession, readSession, () => null);
  const hasHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => HYDRATION_SNAPSHOT,
    () => SERVER_HYDRATION_SNAPSHOT,
  );
  const [isPending, startTransition] = useTransition();
  const status: "loading" | "guest" | "authenticated" = !hasHydrated
    ? "loading"
    : session
      ? "authenticated"
      : "guest";

  async function login(
    identifier: string,
    password: string,
    requestedRole?: "user" | "agency_admin",
  ) {
    const nextSession = await apiFetch<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password, requestedRole }),
    });

    startTransition(() => {
      persistSession(nextSession);
    });

    return nextSession;
  }

  async function signupTraveler(input: SignupTravelerInput) {
    await apiFetch<{ message: string }>("/auth/signup/traveler", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async function signupAgency(input: SignupAgencyInput) {
    await apiFetch<{ message: string }>("/auth/signup/agency", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async function refreshSession(currentSession: AuthSession) {
    const tokens = await apiFetch<
      Pick<AuthSession, "accessToken" | "refreshToken" | "role" | "agencyId" | "availableRoles">
    >("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
    });

    const nextSession: AuthSession = {
      ...currentSession,
      ...tokens,
      user: await apiFetch<AuthSession["user"]>("/auth/me", {
        token: tokens.accessToken,
      }),
    };

    persistSession(nextSession);

    return nextSession;
  }

  async function refreshAuthSession() {
    if (!session) return null;
    return refreshSession(session);
  }

  async function switchRole(role: "user" | "agency_admin") {
    const nextSession = await apiFetchWithAuth<AuthSession>("/auth/switch-role", {
      method: "POST",
      body: JSON.stringify({ role }),
    });

    persistSession(nextSession);
    return nextSession;
  }

  async function apiFetchWithAuth<T>(path: string, init: RequestInit = {}) {
    if (!session) {
      throw new ApiError(401, ["Please log in to continue"]);
    }

    try {
      return await apiFetch<T>(path, {
        ...init,
        token: session.accessToken,
      });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        throw error;
      }

      const refreshed = await refreshSession(session);
      return apiFetch<T>(path, {
        ...init,
        token: refreshed.accessToken,
      });
    }
  }

  function logout() {
    persistSession(null);
  }

  function updateUser(user: AuthSession["user"]) {
    if (!session) return;
    const nextSession: AuthSession = {
      ...session,
      user,
      agencyId:
        session.role === "agency_admin" ? (user.agency?.id ?? session.agencyId ?? null) : null,
      availableRoles: deriveAvailableRoles(user),
    };
    persistSession(nextSession);
  }

  const value: AuthContextValue = {
    session,
    status,
    isPending,
    login,
    signupTraveler,
    signupAgency,
    refreshAuthSession,
    switchRole,
    updateUser,
    logout,
    apiFetchWithAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
