import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MapPin, Route, Star, Ticket, ShieldCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgencyVerificationBadge, UserVerificationBadge } from "@/components/ui/verification-badge";
import { ProfileFollowPanel } from "@/components/social/profile-follow-panel";
import { getPublicProfile } from "@/lib/api/public";
import type { SocialProfile, SocialReview, SocialTripSummary } from "@/lib/api/types";
import { formatCompactDate, formatCurrency, initials } from "@/lib/format";

function TripHistorySection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: ReactNode;
  items: SocialTripSummary[];
}) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="font-display text-xl text-[var(--color-ink-950)]">{title}</h2>
      </div>
      {items.length === 0 ? (
        <CardInset className="p-4 text-sm text-[var(--color-ink-500)]">Nothing public here yet.</CardInset>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isPackage = typeof item.basePrice === "number";
            const href = isPackage ? `/packages/${item.slug}` : `/plans/${item.slug}`;
            return (
              <Link key={item.id} href={href}>
                <CardInset className="space-y-1 transition hover:shadow-[var(--shadow-clay-sm)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base text-[var(--color-ink-950)]">{item.title}</p>
                      <p className="text-sm text-[var(--color-ink-600)]">{item.destination}</p>
                    </div>
                    {isPackage ? (
                      <p className="text-sm font-semibold text-[var(--color-sea-700)]">
                        {formatCurrency(item.basePrice)}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-ink-400)]">
                    {item.status} · {formatCompactDate(item.startDate)}
                  </p>
                </CardInset>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ReviewsSection({ reviews }: { reviews: SocialReview[] }) {
  return (
    <section className="space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
          <Star className="size-5" />
        </div>
        <h2 className="font-display text-xl text-[var(--color-ink-950)]">Reviews received</h2>
      </div>
      {reviews.length === 0 ? (
        <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
          No public reviews yet.
        </CardInset>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {reviews.map((review) => (
            <Card key={review.id} className="space-y-3 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={`size-4 ${
                        index < review.overallRating
                          ? "fill-[var(--color-sunset-400)] text-[var(--color-sunset-500)]"
                          : "text-[var(--color-ink-300)]"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-[var(--color-ink-500)]">
                  {formatCompactDate(review.createdAt)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-ink-600)]">
                {review.comment || "No comment shared."}
              </p>
              <p className="text-xs text-[var(--color-ink-500)]">Reviewed by {review.reviewer.fullName}</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

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

  if (!profile) {
    return {
      title: "Profile not found",
      description: "This TravellersIn profile is unavailable.",
    };
  }

  return {
    title: `${profile.name} (@${profile.handle})`,
    description: profile.bio ?? `${profile.name} on TravellersIn`,
  };
}

function VerificationPill({ profile }: { profile: SocialProfile }) {
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

  const tripHistoryCount =
    profile.profileType === "traveler"
      ? profile.plansCreated.length + profile.tripsJoined.length
      : profile.packages.length;
  const reviewCount =
    profile.profileType === "traveler" ? profile.reviewsReceived.length : profile.totalReviews;

  return (
    <div className="page-shell space-y-8 py-10">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="clay-blob -top-12 -right-12 size-36 bg-[var(--color-sea-200)] opacity-10 animate-blob" />
        <div className="clay-blob -bottom-10 -left-8 size-24 bg-[var(--color-lavender-100)] opacity-70 animate-blob delay-300" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] font-display text-2xl text-[var(--color-sea-800)] shadow-[var(--shadow-clay)]">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={profile.name}
                  width={80}
                  height={80}
                  className="size-full object-cover"
                />
              ) : (
                initials(profile.name)
              )}
            </div>

            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={profile.profileType === "traveler" ? "lavender" : "sea"}>
                  {profile.profileType === "traveler" ? "Traveler profile" : "Agency profile"}
                </Badge>
                <VerificationPill profile={profile} />
              </div>
              <h1 className="mt-3 font-display text-3xl text-[var(--color-ink-950)] sm:text-4xl">
                {profile.name}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-ink-500)]">@{profile.handle}</p>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--color-ink-600)]">
                {profile.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {profile.location}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Route className="size-3.5" />
                  {tripHistoryCount} trip records
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-3.5 fill-current text-[var(--color-sunset-500)]" />
                  {profile.avgRating.toFixed(1)} average
                </span>
                <span>{reviewCount} reviews</span>
              </div>

              {profile.bio ? (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-600)]">
                  {profile.bio}
                </p>
              ) : null}

              {profile.profileType === "traveler" && profile.travelPreferences ? (
                <CardInset className="mt-4 p-4 text-sm leading-relaxed text-[var(--color-ink-600)]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                    Travel preferences
                  </p>
                  <p className="mt-2">{profile.travelPreferences}</p>
                </CardInset>
              ) : null}
            </div>
          </div>

          <ProfileFollowPanel
            handle={profile.handle}
            followerCount={profile.followerCount}
            followingCount={profile.followingCount}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
              <MapPin className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Travel map
              </p>
              <h2 className="font-display text-xl text-[var(--color-ink-950)]">Places on this profile</h2>
            </div>
          </div>
          <div className="mt-5 rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--color-sea-50)] via-[var(--color-surface-raised)] to-[var(--color-lavender-50)] p-5 shadow-[var(--shadow-clay-inset)]">
            {profile.travelMap.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.travelMap.map((destination) => (
                  <Badge key={destination} variant="outline" className="bg-white/70">
                    {destination}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-ink-500)]">No destinations mapped yet.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Snapshot
              </p>
              <h2 className="font-display text-xl text-[var(--color-ink-950)]">Profile summary</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <CardInset className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Trip history
              </p>
              <p className="mt-2 font-display text-2xl text-[var(--color-ink-950)]">{tripHistoryCount}</p>
            </CardInset>
            <CardInset className="p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Reviews
              </p>
              <p className="mt-2 font-display text-2xl text-[var(--color-ink-950)]">{reviewCount}</p>
            </CardInset>
            {profile.profileType === "traveler" ? (
              <>
                <CardInset className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                    Plans created
                  </p>
                  <p className="mt-2 font-display text-2xl text-[var(--color-ink-950)]">{profile.plansCreated.length}</p>
                </CardInset>
                <CardInset className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                    Trips joined
                  </p>
                  <p className="mt-2 font-display text-2xl text-[var(--color-ink-950)]">{profile.tripsJoined.length}</p>
                </CardInset>
              </>
            ) : (
              <>
                <CardInset className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                    Packages
                  </p>
                  <p className="mt-2 font-display text-2xl text-[var(--color-ink-950)]">{profile.packages.length}</p>
                </CardInset>
                <CardInset className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                    Total trips
                  </p>
                  <p className="mt-2 font-display text-2xl text-[var(--color-ink-950)]">{profile.totalTrips}</p>
                </CardInset>
              </>
            )}
          </div>
        </Card>
      </div>

      {profile.profileType === "traveler" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <TripHistorySection
            title="Plans created"
            icon={<Route className="size-4 text-[var(--color-sea-600)]" />}
            items={profile.plansCreated}
          />
          <TripHistorySection
            title="Trips joined"
            icon={<Ticket className="size-4 text-[var(--color-sea-600)]" />}
            items={profile.tripsJoined}
          />
        </div>
      ) : (
        <TripHistorySection
          title="Packages"
          icon={<Ticket className="size-4 text-[var(--color-sea-600)]" />}
          items={profile.packages}
        />
      )}

      <ReviewsSection reviews={profile.reviewsReceived} />
    </div>
  );
}
