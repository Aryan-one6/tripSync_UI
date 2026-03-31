/**
 * Social API layer — Phase 3.2
 * Implements follow/unfollow, followers/following, and feed helpers.
 * Uses real API calls where the endpoint exists; falls back to mocks otherwise.
 */

import type { FollowState } from "@/lib/api/types";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SocialApiConfig {
  apiFetchWithAuth: <T>(url: string, options?: RequestInit) => Promise<T>;
}

// ─── Follow / Unfollow ───────────────────────────────────────────────────────

export async function followUser(
  handle: string,
  config: SocialApiConfig,
): Promise<FollowState> {
  return config.apiFetchWithAuth<FollowState>(
    `/social/profiles/${encodeURIComponent(handle)}/follow`,
    { method: "POST" },
  );
}

export async function unfollowUser(
  handle: string,
  config: SocialApiConfig,
): Promise<FollowState> {
  return config.apiFetchWithAuth<FollowState>(
    `/social/profiles/${encodeURIComponent(handle)}/follow`,
    { method: "DELETE" },
  );
}

// ─── Follow State ─────────────────────────────────────────────────────────────

export async function getFollowState(
  handle: string,
  config: SocialApiConfig,
): Promise<FollowState> {
  return config.apiFetchWithAuth<FollowState>(
    `/social/profiles/${encodeURIComponent(handle)}/follow-state`,
  );
}

// ─── Followers / Following Lists ──────────────────────────────────────────────

export interface FollowerEntry {
  id: string;
  handle: string;
  name: string;
  avatarUrl?: string | null;
  profileType: "traveler" | "agency";
}

export async function getFollowers(
  handle: string,
  config: SocialApiConfig,
): Promise<FollowerEntry[]> {
  return config
    .apiFetchWithAuth<FollowerEntry[]>(
      `/social/profiles/${encodeURIComponent(handle)}/followers`,
    )
    .catch(() =>
      // Mock fallback so the UI doesn't break if the endpoint is missing
      [],
    );
}

export async function getFollowing(
  handle: string,
  config: SocialApiConfig,
): Promise<FollowerEntry[]> {
  return config
    .apiFetchWithAuth<FollowerEntry[]>(
      `/social/profiles/${encodeURIComponent(handle)}/following`,
    )
    .catch(() => []);
}

// ─── isFollowing helper ───────────────────────────────────────────────────────

export async function isFollowing(
  handle: string,
  config: SocialApiConfig,
): Promise<boolean> {
  const state = await getFollowState(handle, config).catch(() => null);
  return state?.isFollowing ?? false;
}

// ─── Following Feed ───────────────────────────────────────────────────────────

export async function getFollowingFeed(
  config: SocialApiConfig,
  limit = 20,
) {
  return config
    .apiFetchWithAuth(`/social/feed/following?limit=${limit}`)
    .catch(() => []);
}
