import type { Metadata } from "next";
import { MapPin, Route, Star, Ticket } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AgencyVerificationBadge, UserVerificationBadge } from "@/components/ui/verification-badge";
import { ProfileFollowPanel } from "@/components/social/profile-follow-panel";
import { ProfileCommonContext } from "@/components/social/profile-common-context";
import { ProfileTabs } from "@/components/social/profile-tabs";
import { getPublicProfile } from "@/lib/api/public";
import type { SocialProfile } from "@/lib/api/types";
import { initials } from "@/lib/format";

async function loadProfile(username: string) {
  return getPublicProfile(username);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await loadProfile(username);
  if (!profile) return { title: "Profile not found" };
  return {
    title: `${profile.name} (@${profile.handle})`,
    description: profile.bio ?? `${profile.name} on TravellersIn`,
  };
}

function VerificationBadge({ profile }: { profile: SocialProfile }) {
  if (profile.profileType === "traveler") {
    return <UserVerificationBadge tier={profile.verification} />;
  }
  return <AgencyVerificationBadge status={profile.verification} />;
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await loadProfile(username);

  if (!profile) {
    return (
      <div className="page-shell py-12">
        <EmptyState
          title="Profile not found"
          description="The profile is unavailable or the handle is incorrect."
        />
      </div>
    );
  }

  const tripCount =
    profile.profileType === "traveler"
      ? profile.plansCreated.length + profile.tripsJoined.length
      : profile.packages.length;

  return (
    <div className="page-shell space-y-6 py-8">
      {/* Profile header */}
      <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: avatar + info */}
          <div className="flex items-start gap-5">
            {/* 96px avatar circle */}
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-200)] font-display text-2xl font-bold text-[var(--color-sea-800)] shadow-[var(--shadow-sm)]">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="size-full object-cover" />
              ) : (
                initials(profile.name)
              )}
            </div>

            <div className="min-w-0">
              {/* Name + verification */}
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-[var(--color-ink-950)]">{profile.name}</h1>
                <VerificationBadge profile={profile} />
              </div>
              <p className="mt-0.5 text-sm text-[var(--color-ink-500)]">@{profile.handle}</p>

              {/* Location */}
              {profile.location ? (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-[var(--color-ink-600)]">
                  <MapPin className="size-3.5" />
                  {profile.location}
                </p>
              ) : null}

              {/* Bio (max 2 lines) */}
              {profile.bio ? (
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--color-ink-600)] line-clamp-2">{profile.bio}</p>
              ) : null}

              {/* Stats row */}
              <div className="mt-4 flex flex-wrap items-center gap-5 text-sm">
                <span className="flex items-center gap-1.5 text-[var(--color-ink-700)]">
                  {profile.profileType === "traveler" ? (
                    <Route className="size-4 text-[var(--color-sea-500)]" />
                  ) : (
                    <Ticket className="size-4 text-[var(--color-sea-500)]" />
                  )}
                  <span className="font-semibold text-[var(--color-ink-950)]">{tripCount}</span>{" "}
                  {profile.profileType === "traveler" ? "trips" : "packages"}
                </span>
                <span className="flex items-center gap-1.5 text-[var(--color-ink-700)]">
                  <Star className="size-4 fill-[var(--color-sunset-400)] text-[var(--color-sunset-500)]" />
                  <span className="font-semibold text-[var(--color-ink-950)]">{profile.avgRating.toFixed(1)}</span>{" "}
                  rating
                </span>
              </div>
            </div>
          </div>

          {/* Right: follow counts + follow/unfollow button */}
          <div className="shrink-0">
            <ProfileFollowPanel
              handle={profile.handle}
              messageTargetUserId={
                profile.profileType === "traveler" ? profile.id : profile.ownerId
              }
              followerCount={profile.followerCount}
              followingCount={profile.followingCount}
            />
          </div>
        </div>
      </div>

      <ProfileCommonContext profile={profile} />

      {/* Tabbed sections: Trips / Reviews / About */}
      <ProfileTabs profile={profile} />
    </div>
  );
}
