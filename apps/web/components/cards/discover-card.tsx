"use client";

import Link from "next/link";
import { CalendarDays, Compass, MapPin, Mountain, Palmtree, Sunrise, Users, Star, Phone, Clock } from "lucide-react";
import { formatCurrency, formatDuration, formatDateRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { DiscoverItem } from "@/lib/api/types";

const palettes = [
  { gradient: "from-[#0f766e] via-[#0d9488] to-[#2dd4bf]", Icon: Mountain },
  { gradient: "from-[#b45309] via-[#ea580c] to-[#fb923c]", Icon: Sunrise },
  { gradient: "from-[#0b3b66] via-[#155e8a] to-[#38bdf8]", Icon: Compass },
  { gradient: "from-[#3f6212] via-[#4d7c0f] to-[#84cc16]", Icon: Palmtree },
];

function hash(input: string) {
  return Array.from(input).reduce((total, char) => total + char.charCodeAt(0), 0);
}

// Demo data for ratings (in real app, would come from backend)
function getRandomRating() {
  return (Math.random() * 2 + 3.5).toFixed(1); // 3.5 - 5.5
}

function getRatingCount() {
  return Math.floor(Math.random() * 100) + 10; // 10-110 reviews
}

export function DiscoverCard({ item }: { item: DiscoverItem }) {
  const href =
    item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const isPlan = item.originType === "plan";
  const dur = formatDuration(item.startDate, item.endDate);
  const durLabel = dur ? `${dur.days} Days` : "Flexible";
  const budgetLabel = formatCurrency(item.priceLow ?? item.priceHigh ?? null);
  const palette = palettes[hash(item.title) % palettes.length];
  const { Icon } = palette;
  const vibe = item.vibes?.[0] ?? "";
  const rating = getRandomRating();
  const ratingCount = getRatingCount();

  return (
    <div className="group">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white",
          "shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-300",
          "group-hover:-translate-y-1 group-hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)]",
        )}
      >
        {/* Image Container */}
        <div className="relative overflow-hidden rounded-t-2xl">
          <div className="relative min-h-[16rem] bg-[var(--color-surface-2)]">
            {item.coverImageUrl ? (
              <img
                src={item.coverImageUrl}
                alt={item.title}
                className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className={cn("absolute inset-0 bg-linear-to-br", palette.gradient)}>
                <Icon className="absolute right-5 top-5 size-16 text-white/15" />
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-linear-to-t from-black/40 via-transparent to-transparent" />

            {/* Badges */}
            <div className="absolute left-3 top-3 flex gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                  isPlan
                    ? "bg-[var(--color-sea-500)] text-white"
                    : "bg-[var(--color-sky-500)] text-white",
                )}
              >
                {isPlan ? "User Plan" : "Agency Package"}
              </span>
              {vibe && (
                <span className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                  {vibe}
                </span>
              )}
            </div>

            {/* Floating Rating Badge */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/25 bg-black/50 px-2.5 py-1.5 backdrop-blur-sm">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "size-3",
                      i < Math.floor(Number(rating))
                        ? "fill-[#fbbf24] text-[#fbbf24]"
                        : "text-white/30"
                    )}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-white">{rating}</span>
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="p-4 sm:p-5">
          {/* Location & Destination */}
          <div className="mb-2 flex items-start gap-2">
            <MapPin className="size-3.5 shrink-0 text-[var(--color-sea-600)] mt-0.5" />
            <span className="text-xs font-semibold text-[var(--color-ink-600)]">
              {item.destination}
              {item.destinationState ? `, ${item.destinationState}` : ""}
            </span>
          </div>

          {/* Title */}
          <h3 className="mb-3 line-clamp-2 font-display text-sm font-black leading-snug text-[var(--color-ink-950)]">
            {item.title}
          </h3>

          {/* Rating & Review Count */}
          <div className="mb-3 flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-3",
                    i < Math.floor(Number(rating))
                      ? "fill-[var(--color-sea-500)] text-[var(--color-sea-500)]"
                      : "text-[var(--color-border)]"
                  )}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-[var(--color-ink-900)]">{rating}</span>
            <span className="text-xs text-[var(--color-ink-500)]">({ratingCount})</span>
          </div>

          {/* Details Grid */}
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-[var(--color-surface-1)] p-2.5">
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-600)]">Duration</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-[var(--color-ink-950)]">
                <Clock className="size-3" />
                {durLabel}
              </p>
            </div>
            <div className="text-center border-l border-r border-[var(--color-border)]">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-600)]">Budget</p>
              <p className="mt-1 text-xs font-bold text-[var(--color-sea-600)]">{budgetLabel}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--color-ink-600)]">Members</p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs font-bold text-[var(--color-ink-950)]">
                <Users className="size-3" />
                {item.joinedCount}/{item.groupSizeMax}
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-2">
            <Link href={href} className="flex-1">
              <Button type="button" variant="soft" size="sm" className="w-full">
                {isPlan ? "View Plan" : "View Package"}
              </Button>
            </Link>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="w-fit"
              onClick={() => {
                // In real app, would open join modal
                console.log("Join clicked");
              }}
            >
              <Phone className="size-3" />
              Join
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Compact 2-column card used for "Trending Near You" */
export function DiscoverCardCompact({ item }: { item: DiscoverItem }) {
  const href =
    item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const palette = palettes[hash(item.title) % palettes.length];
  const { Icon } = palette;
  const dateLabel = formatDateRange(item.startDate, item.endDate);
  const isPlan = item.originType === "plan";
  const budgetLabel = formatCurrency(item.priceLow ?? item.priceHigh ?? null);
  const rating = getRandomRating();

  return (
    <Link href={href} className="group block">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-white",
          "shadow-[var(--shadow-sm)] transition-all duration-300",
          "group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-md)]",
        )}
      >
        <div className="relative aspect-4/5">
          {item.coverImageUrl ? (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className={cn("absolute inset-0 bg-linear-to-br", palette.gradient)}>
              <Icon className="absolute right-3 top-3 size-10 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

          {/* Tag */}
          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/25 bg-black/50 px-2 py-1 text-[9px] font-semibold text-white backdrop-blur-sm">
            {isPlan ? <Users className="size-2.5" /> : <CalendarDays className="size-2.5" />}
            {isPlan ? "Plan" : "Package"}
          </div>

          {/* Rating Badge */}
          <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full border border-white/25 bg-black/50 px-1.5 py-0.5 backdrop-blur-sm">
            <Star className="size-2.5 fill-[#fbbf24] text-[#fbbf24]" />
            <span className="text-[9px] font-bold text-white">{rating}</span>
          </div>

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="line-clamp-2 font-display text-[0.85rem] font-bold leading-tight text-white">
              {item.title}
            </p>
            <div className="mt-2 flex items-center justify-between gap-1.5">
              <p className="text-[10px] text-white/80">{dateLabel}</p>
              <span className="text-[10px] font-bold text-[var(--color-sea-300)]">{budgetLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
