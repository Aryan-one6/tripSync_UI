"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { VIBE_OPTIONS } from "@/lib/constants";
import { useAuth } from "@/lib/auth/auth-context";
import type { Offer, SocialProfile, TripMembership, UserSummary } from "@/lib/api/types";

const INTEREST_KEYWORDS: Record<string, string[]> = {
  Adventure: ["adventure", "trek", "trekking", "camping", "rafting", "hiking"],
  "Road Trip": ["road trip", "bike trip", "motorbike", "driving"],
  Wellness: ["wellness", "yoga", "meditation", "retreat"],
  Culture: ["culture", "heritage", "history", "local art", "festival"],
  Workation: ["workation", "remote work", "digital nomad"],
  Food: ["food", "cuisine", "cafe", "culinary", "street food"],
  Mountains: ["mountain", "hills", "himachal", "uttarakhand"],
  Beach: ["beach", "coast", "goa", "island"],
};

type GroupMembersResponse = {
  group: { id: string };
  members: Array<{
    status: "INTERESTED" | "APPROVED" | "COMMITTED" | "LEFT" | "REMOVED";
    user: UserSummary;
  }>;
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function extractInterestTags(text: string) {
  const lower = text.toLowerCase();
  return VIBE_OPTIONS.filter((label) =>
    (INTEREST_KEYWORDS[label] ?? [label.toLowerCase()]).some((keyword) =>
      lower.includes(keyword),
    ),
  );
}

export function ProfileCommonContext({ profile }: { profile: SocialProfile }) {
  const { status, session, apiFetchWithAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sharedGroupTitles, setSharedGroupTitles] = useState<string[]>([]);
  const [commonInterests, setCommonInterests] = useState<string[]>([]);
  const [commonDestinations, setCommonDestinations] = useState<string[]>([]);

  const targetUserId = profile.profileType === "traveler" ? profile.id : profile.ownerId;
  const isOwnProfile = session?.user.id === targetUserId;

  const profileInterestTags = useMemo(() => {
    if (profile.profileType === "traveler") {
      return extractInterestTags(`${profile.travelPreferences ?? ""} ${profile.bio ?? ""}`);
    }
    const packageSignal = profile.packages
      .flatMap((item) => [item.title, item.destination])
      .join(" ");
    return extractInterestTags(`${profile.bio ?? ""} ${packageSignal}`);
  }, [profile]);

  useEffect(() => {
    if (status !== "authenticated" || !session || isOwnProfile) {
      setSharedGroupTitles([]);
      setCommonInterests([]);
      setCommonDestinations([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const viewerTrips = await apiFetchWithAuth<TripMembership[]>("/groups/my").catch(
        () => [] as TripMembership[],
      );
      const viewerOffers =
        session.role === "agency_admin"
          ? await apiFetchWithAuth<Offer[]>("/offers/my").catch(() => [] as Offer[])
          : ([] as Offer[]);

      const viewerInterestTags = extractInterestTags(
        `${session.user.travelPreferences ?? ""} ${session.user.bio ?? ""}`,
      );
      const profileInterestSet = new Set(profileInterestTags.map((item) => item.toLowerCase()));
      const overlapInterests = viewerInterestTags
        .filter((item) => profileInterestSet.has(item.toLowerCase()))
        .slice(0, 4);

      const memberships = viewerTrips.filter((trip) => {
        const active = trip.status === "APPROVED" || trip.status === "COMMITTED";
        const tripStatus = trip.group.plan?.status ?? trip.group.package?.status;
        const open = !tripStatus || (tripStatus !== "CANCELLED" && tripStatus !== "EXPIRED");
        return active && open;
      });

      const memberPayloads = await Promise.all(
        memberships.map((trip) =>
          apiFetchWithAuth<GroupMembersResponse>(`/groups/${trip.group.id}/members`).catch(
            () => null,
          ),
        ),
      );

      const overlapGroups = memberships
        .filter((trip, index) => {
          const payload = memberPayloads[index];
          if (!payload) return false;
          return payload.members.some(
            (member) =>
              member.user.id === targetUserId &&
              (member.status === "APPROVED" || member.status === "COMMITTED"),
          );
        })
        .map((trip) => trip.group.plan?.title ?? trip.group.package?.title ?? "Trip group");

      const viewerDestinations = new Map<string, string>();
      const addViewerDestination = (value?: string | null) => {
        if (!value) return;
        const key = normalizeKey(value);
        if (!key) return;
        viewerDestinations.set(key, value.trim());
      };
      addViewerDestination(session.user.city);
      memberships.forEach((trip) => {
        addViewerDestination(trip.group.plan?.destination);
        addViewerDestination(trip.group.package?.destination);
      });
      viewerOffers.forEach((offer) => addViewerDestination(offer.plan?.destination));

      const profileDestinations = new Map<string, string>();
      const addProfileDestination = (value?: string | null) => {
        if (!value) return;
        const key = normalizeKey(value);
        if (!key) return;
        profileDestinations.set(key, value.trim());
      };
      addProfileDestination(profile.location);
      if (profile.profileType === "traveler") {
        profile.travelMap.forEach((dest) => addProfileDestination(dest));
        profile.plansCreated.forEach((trip) => addProfileDestination(trip.destination));
        profile.tripsJoined.forEach((trip) => addProfileDestination(trip.destination));
      } else {
        profile.packages.forEach((pkg) => addProfileDestination(pkg.destination));
      }

      const overlapDestinations: string[] = [];
      for (const key of viewerDestinations.keys()) {
        if (profileDestinations.has(key)) {
          overlapDestinations.push(profileDestinations.get(key) ?? viewerDestinations.get(key)!);
        }
      }

      if (cancelled) return;
      setSharedGroupTitles(Array.from(new Set(overlapGroups)).slice(0, 4));
      setCommonInterests(Array.from(new Set(overlapInterests)));
      setCommonDestinations(Array.from(new Set(overlapDestinations)).slice(0, 4));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [apiFetchWithAuth, isOwnProfile, profile, profileInterestTags, session, status, targetUserId]);

  if (status !== "authenticated" || isOwnProfile) return null;
  if (!loading && sharedGroupTitles.length === 0 && commonInterests.length === 0 && commonDestinations.length === 0) {
    return null;
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-[var(--color-lavender-500)]" />
        <h3 className="font-display text-lg text-[var(--color-ink-950)]">Common with you</h3>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {loading && (
          <Badge variant="outline" className="text-[11px]">
            Loading shared context…
          </Badge>
        )}
        {sharedGroupTitles.length > 0 && (
          <Badge variant="sea" className="text-[11px]">
            {sharedGroupTitles.length} common group{sharedGroupTitles.length > 1 ? "s" : ""}
          </Badge>
        )}
        {commonInterests.length > 0 && (
          <Badge variant="lavender" className="text-[11px]">
            {commonInterests.length} shared vibe{commonInterests.length > 1 ? "s" : ""}
          </Badge>
        )}
        {commonDestinations.length > 0 && (
          <Badge variant="sunset" className="text-[11px]">
            {commonDestinations.length} shared destination{commonDestinations.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {!loading && (
        <div className="mt-3 space-y-2">
          {sharedGroupTitles.length > 0 && (
            <p className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-600)]">
              <Users className="size-4 text-[var(--color-sea-600)]" />
              Common groups: {sharedGroupTitles.join(", ")}
            </p>
          )}
          {commonInterests.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm text-[var(--color-ink-600)]">Shared interests:</span>
              {commonInterests.map((tag) => (
                <Badge key={tag} variant="outline" className="!px-2 !py-0.5 text-[11px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {commonDestinations.length > 0 && (
            <p className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink-600)]">
              <MapPin className="size-4 text-[var(--color-sunset-500)]" />
              Both active around {commonDestinations.join(", ")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
