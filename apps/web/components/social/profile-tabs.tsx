"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, MapPin, Route, ShieldCheck, Star, Ticket } from "lucide-react";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SocialProfile, SocialReview, SocialTripSummary } from "@/lib/api/types";
import { formatCompactDate, formatCurrency } from "@/lib/format";

type Tab = "trips" | "reviews" | "about";

function TripCard({ item }: { item: SocialTripSummary }) {
  const isPackage = typeof item.basePrice === "number";
  const href = isPackage ? `/packages/${item.slug}` : `/plans/${item.slug}`;
  return (
    <Link href={href}>
      <CardInset className="space-y-2 p-4 transition hover:shadow-(--shadow-sm)">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold text-(--color-ink-950) leading-snug">{item.title}</p>
          {isPackage && item.basePrice ? (
            <p className="shrink-0 text-sm font-semibold text-(--color-sea-700)">
              {formatCurrency(item.basePrice)}
            </p>
          ) : null}
        </div>
        <p className="text-sm text-(--color-ink-600)">{item.destination}{item.destinationState ? `, ${item.destinationState}` : ""}</p>
        {item.startDate ? (
          <p className="flex items-center gap-1.5 text-xs text-(--color-ink-500)">
            <CalendarRange className="size-3.5" />
            {formatCompactDate(item.startDate)}
            {item.endDate ? ` → ${formatCompactDate(item.endDate)}` : ""}
          </p>
        ) : null}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-(--color-ink-400)">
          {item.status}
        </p>
      </CardInset>
    </Link>
  );
}

function ReviewCard({ review }: { review: SocialReview }) {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`size-4 ${
                i < review.overallRating
                  ? "fill-[var(--color-sunset-400)] text-[var(--color-sunset-500)]"
                  : "text-(--color-ink-300)"
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-(--color-ink-500)">{formatCompactDate(review.createdAt)}</span>
      </div>
      {review.comment ? (
        <p className="text-sm leading-relaxed text-(--color-ink-600)">{review.comment}</p>
      ) : null}
      <p className="text-xs text-(--color-ink-500)">by {review.reviewer.fullName}</p>
    </Card>
  );
}

export function ProfileTabs({ profile }: { profile: SocialProfile }) {
  const [activeTab, setActiveTab] = useState<Tab>("trips");

  const tripItems =
    profile.profileType === "traveler"
      ? [...profile.plansCreated, ...profile.tripsJoined]
      : profile.packages;

  const tabs: { id: Tab; label: string }[] = [
    { id: "trips", label: profile.profileType === "traveler" ? "Trips" : "Packages" },
    { id: "reviews", label: `Reviews (${profile.reviewsReceived.length})` },
    { id: "about", label: "About" },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0.5 rounded-full border border-(--color-border) bg-(--color-surface-2) p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-(--color-surface-raised) text-(--color-sea-700) shadow-(--shadow-sm)"
                : "text-(--color-ink-600) hover:bg-white/60 hover:text-(--color-ink-900)"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trips tab */}
      {activeTab === "trips" && (
        tripItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {tripItems.map((item) => <TripCard key={item.id} item={item} />)}
          </div>
        ) : (
          <Card className="p-8 text-center text-sm text-(--color-ink-500)">
            No trips public yet.
          </Card>
        )
      )}

      {/* Reviews tab */}
      {activeTab === "reviews" && (
        profile.reviewsReceived.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.reviewsReceived.map((r) => <ReviewCard key={r.id} review={r} />)}
          </div>
        ) : (
          <Card className="p-8 text-center text-sm text-(--color-ink-500)">
            No reviews yet.
          </Card>
        )
      )}

      {/* About tab */}
      {activeTab === "about" && (
        <div className="space-y-4">
          {profile.bio ? (
            <Card className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500) mb-2">Bio</p>
              <p className="text-sm leading-relaxed text-(--color-ink-700)">{profile.bio}</p>
            </Card>
          ) : null}

          {profile.profileType === "traveler" && profile.travelPreferences ? (
            <Card className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500) mb-2">Travel Preferences</p>
              <p className="text-sm leading-relaxed text-(--color-ink-700)">{profile.travelPreferences}</p>
            </Card>
          ) : null}

          {profile.travelMap.length > 0 ? (
            <Card className="p-5">
              <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500)">
                <MapPin className="size-3.5" /> Destinations visited
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.travelMap.map((dest) => (
                  <Badge key={dest} variant="outline">{dest}</Badge>
                ))}
              </div>
            </Card>
          ) : null}

          <Card className="p-5">
            <p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500)">
              <ShieldCheck className="size-3.5" /> Verification
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <CardInset className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500)">Status</p>
                <p className="mt-1 text-sm font-semibold text-(--color-ink-900) capitalize">{profile.verification}</p>
              </CardInset>
              <CardInset className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500)">Rating</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-(--color-ink-900)">
                  <Star className="size-4 fill-[var(--color-sunset-400)] text-[var(--color-sunset-500)]" />
                  {profile.avgRating.toFixed(1)}
                </p>
              </CardInset>
              {profile.profileType === "traveler" ? (
                <>
                  <CardInset className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500)">Plans created</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-(--color-ink-900)">
                      <Route className="size-4 text-(--color-sea-600)" />
                      {profile.plansCreated.length}
                    </p>
                  </CardInset>
                  <CardInset className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500)">Trips joined</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-(--color-ink-900)">
                      <Ticket className="size-4 text-(--color-sea-600)" />
                      {profile.tripsJoined.length}
                    </p>
                  </CardInset>
                </>
              ) : (
                <>
                  <CardInset className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500)">Total trips</p>
                    <p className="mt-1 text-sm font-semibold text-(--color-ink-900)">{profile.totalTrips}</p>
                  </CardInset>
                  <CardInset className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500)">Packages</p>
                    <p className="mt-1 text-sm font-semibold text-(--color-ink-900)">{profile.packages.length}</p>
                  </CardInset>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
