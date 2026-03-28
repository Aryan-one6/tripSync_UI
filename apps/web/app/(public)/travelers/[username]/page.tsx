import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, MessageSquareText, Route, Star, Ticket } from "lucide-react";
import { Card, CardInset } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { UserVerificationBadge } from "@/components/ui/verification-badge";
import { getTravelerByUsername } from "@/lib/api/public";
import { formatCompactDate, initials } from "@/lib/format";

async function loadTraveler(username: string) {
  return getTravelerByUsername(username);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const traveler = await loadTraveler(username);

  if (!traveler) {
    return {
      title: "Traveler not found",
      description: "This TravellersIn traveler profile is unavailable.",
    };
  }

  return {
    title: traveler.fullName,
    description: traveler.bio ?? `${traveler.fullName} on TravellersIn`,
  };
}

export default async function TravelerProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const traveler = await loadTraveler(username);

  if (!traveler) {
    return (
      <div className="page-shell py-12">
        <EmptyState
          title="Traveler not found"
          description="The traveler profile is unavailable or the username is incorrect."
        />
      </div>
    );
  }

  return (
    <div className="page-shell space-y-8 py-10">
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="clay-blob -top-12 -right-12 size-32 bg-[var(--color-sea-200)] opacity-10 animate-blob" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex size-18 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] font-display text-xl text-[var(--color-sea-800)] shadow-[var(--shadow-clay)] sm:size-20 sm:text-2xl">
              {initials(traveler.fullName)}
            </div>
            <div>
              <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                Traveler profile
              </span>
              <h1 className="mt-2 font-display text-2xl text-[var(--color-ink-950)] sm:text-3xl">
                {traveler.fullName}
              </h1>
              <div className="mt-2">
                <UserVerificationBadge tier={traveler.verification} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-ink-600)]">
                {traveler.city ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {traveler.city}
                  </span>
                ) : null}
                <span>{traveler.completedTrips ?? 0} trips</span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-3.5 fill-current text-[var(--color-sunset-500)]" />
                  {(traveler.avgRating ?? 0).toFixed(1)}
                </span>
              </div>
              {traveler.bio ? (
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--color-ink-600)]">
                  {traveler.bio}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link href={`/dashboard/messages?target=${traveler.id}`}>
              <Button>
                <MessageSquareText className="size-4" />
                Message traveler
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Route className="size-4 text-[var(--color-sea-600)]" />
            <h2 className="font-display text-xl text-[var(--color-ink-950)]">Hosted plans</h2>
          </div>
          {traveler.createdPlans.length === 0 ? (
            <CardInset className="p-4 text-sm text-[var(--color-ink-500)]">
              No public hosted plans yet.
            </CardInset>
          ) : (
            <div className="space-y-3">
              {traveler.createdPlans.map((plan) => (
                <Link key={plan.id} href={`/plans/${plan.slug}`}>
                  <CardInset className="space-y-1 transition hover:shadow-[var(--shadow-clay-sm)]">
                    <p className="font-display text-base text-[var(--color-ink-950)]">{plan.title}</p>
                    <p className="text-sm text-[var(--color-ink-600)]">{plan.destination}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-ink-400)]">
                      {plan.status} · {formatCompactDate(plan.startDate)}
                    </p>
                  </CardInset>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2">
            <Ticket className="size-4 text-[var(--color-sea-600)]" />
            <h2 className="font-display text-xl text-[var(--color-ink-950)]">Joined trips</h2>
          </div>
          {traveler.joinedTrips.length === 0 ? (
            <CardInset className="p-4 text-sm text-[var(--color-ink-500)]">
              No public joined trips yet.
            </CardInset>
          ) : (
            <div className="space-y-3">
              {traveler.joinedTrips.map((trip) => (
                <Link key={`${trip.slug}-${trip.id}`} href={`/${"coverImageUrl" in trip ? "plans" : "packages"}/${trip.slug}`}>
                  <CardInset className="space-y-1 transition hover:shadow-[var(--shadow-clay-sm)]">
                    <p className="font-display text-base text-[var(--color-ink-950)]">{trip.title}</p>
                    <p className="text-sm text-[var(--color-ink-600)]">{trip.destination}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-ink-400)]">
                      {trip.status} · {formatCompactDate(trip.startDate)}
                    </p>
                  </CardInset>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <section className="space-y-5 pb-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
            <Star className="size-5" />
          </div>
          <h2 className="font-display text-xl text-[var(--color-ink-950)]">Recent co-traveler reviews</h2>
        </div>
        {traveler.reviewsReceived.length === 0 ? (
          <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
            No public reviews yet.
          </CardInset>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {traveler.reviewsReceived.map((review) => (
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
                <p className="text-xs text-[var(--color-ink-500)]">
                  Reviewed by {review.reviewer.fullName}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
