import { apiFetch, safeApiFetch } from "@/lib/api/client";
import type { QueryParams } from "@/lib/api/client";
import type {
  AgencySummary,
  DiscoverItem,
  PackageDetails,
  PlanDetails,
  PublicTravelerProfile,
  SocialFeedItem,
  SocialProfile,
} from "@/lib/api/types";

interface DiscoverQuery extends QueryParams {
  audience?: "traveler" | "agency";
  destination?: string;
  budgetMin?: number;
  budgetMax?: number;
  vibes?: string;
  originType?: "plan" | "package";
  groupType?: "friends" | "couples" | "solo" | "family" | "female_only";
  sort?: "recent" | "price_low" | "price_high" | "popular";
}

export async function getDiscoverItems(query: DiscoverQuery = {}) {
  return safeApiFetch<DiscoverItem[]>("/discover", [], {
    query,
    cache: "no-store",
  });
}

export async function getTrendingItems() {
  return safeApiFetch<DiscoverItem[]>("/discover/trending", [], {
    cache: "no-store",
  });
}

export async function searchDiscover(q: string) {
  if (!q.trim()) return [];

  return safeApiFetch<DiscoverItem[]>("/discover/search", [], {
    query: { q },
    cache: "no-store",
  });
}

export async function getPlanBySlug(slug: string) {
  return safeApiFetch<PlanDetails | null>(`/plans/slug/${slug}`, null, {
    cache: "no-store",
  });
}

export async function getPackageBySlug(slug: string) {
  return safeApiFetch<PackageDetails | null>(`/packages/slug/${slug}`, null, {
    cache: "no-store",
  });
}

export async function getAgencies(query: {
  city?: string;
  state?: string;
  specialization?: string;
  destination?: string;
} = {}) {
  return safeApiFetch<AgencySummary[]>("/agencies/browse", [], {
    query,
    cache: "no-store",
  });
}

export async function getAgencyBySlug(slug: string) {
  return apiFetch<
    AgencySummary & {
      packages: PackageDetails[];
      reviewsReceived: Array<{
        id: string;
        overallRating: number;
        comment?: string | null;
        createdAt: string;
        reviewer: { id: string; fullName: string; avatarUrl?: string | null };
      }>;
    }
  >(`/agencies/${slug}`, {
    cache: "no-store",
  }).catch(() => null);
}

export async function getTravelerByUsername(username: string) {
  return apiFetch<PublicTravelerProfile>(`/users/profile/${username}`, {
    cache: "no-store",
  }).catch(() => null);
}

export async function getSocialFeed(query: { limit?: number } = {}) {
  return safeApiFetch<SocialFeedItem[]>("/social/feed", [], {
    query,
    cache: "no-store",
  });
}

export async function getPublicProfile(handle: string) {
  return apiFetch<SocialProfile>(`/social/profiles/${handle}`, {
    cache: "no-store",
  }).catch(() => null);
}
