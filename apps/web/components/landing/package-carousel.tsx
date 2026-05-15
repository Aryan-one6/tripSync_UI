"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, ChevronRight, MapPin, MessageCircle, Star, Users, Zap } from "lucide-react";
import { getTrendingItems } from "@/lib/api/public";
import type { DiscoverItem } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCurrency, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PackageCarouselProps {
  title: string;
  subtitle?: string;
  filter?: { vibes?: string; destination?: string };
  viewAllHref?: string;
  bg?: string;
}

function hash(input: string) {
  return Array.from(input).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function seedRating(id: string) {
  const n = hash(id);
  return { rating: (3.8 + (n % 13) * 0.1).toFixed(1), count: 12 + (n % 98) };
}

function seedSavings(id: string, price: number | null) {
  const n = hash(id);
  const base = price ?? 15000;
  const saveAmt = Math.round((base * (10 + (n % 20))) / 100 / 250) * 250;
  return { saveAmt, originalPrice: base + saveAmt };
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const VIBE_ALIASES: Record<string, string[]> = {
  adventure: ["trek", "hike", "camp", "outdoor", "thrill"],
  weekend: ["shorttrip", "quicktrip", "2n", "3n"],
  beach: ["coast", "island", "sea", "shore"],
  mountains: ["hill", "himalaya", "valley", "altitude"],
  culture: ["heritage", "temple", "history", "local"],
};

function matchesVibe(item: DiscoverItem, vibe?: string) {
  if (!vibe) return true;
  const vibeKey = normalizeToken(vibe);
  const aliases = VIBE_ALIASES[vibeKey] ?? [];
  const targetTerms = [vibeKey, ...aliases];

  const itemTokens = [
    ...(item.vibes ?? []),
    item.groupType ?? "",
    item.title,
    item.destination,
    item.destinationState ?? "",
  ]
    .map(normalizeToken)
    .filter(Boolean);

  return targetTerms.some((term) => itemTokens.some((token) => token.includes(term)));
}

function rotateAndSlice(data: DiscoverItem[], seedKey: string, count = 8) {
  if (data.length === 0) return data;
  const offset = hash(seedKey) % data.length;
  const rotated = data.slice(offset).concat(data.slice(0, offset));
  return rotated.slice(0, count);
}

function PackageCard({ item }: { item: DiscoverItem }) {
  const { session } = useAuth();
  const href = item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const isPlan = item.originType === "plan";
  const sourceBadge = isPlan
    ? { label: "Community Plan", classes: "bg-[var(--color-amber-500)] text-white" }
    : { label: "Agency Package", classes: "bg-violet-500 text-white" };

  const isAgencyViewer = session?.role === "agency_admin";
  const showSendOfferCta = isAgencyViewer && isPlan;

  const duration = formatDuration(item.startDate, item.endDate);
  const durationLabel = duration ? `${duration.days} days & ${duration.nights} nights` : "Flexible dates";
  const priceValue = item.priceLow ?? item.priceHigh ?? null;
  const { saveAmt, originalPrice } = seedSavings(item.id, priceValue);
  const originalLabel = formatCurrency(originalPrice);
  const savingsLabel = formatCurrency(saveAmt);
  const budgetLabel = formatCurrency(priceValue);

  const { rating, count } = seedRating(item.id);
  const fillPct = Math.min(100, Math.round((item.joinedCount / item.groupSizeMax) * 100));
  const spotsLeft = item.groupSizeMax - item.joinedCount;
  const isFull = spotsLeft <= 0;
  const isAlmostFull = spotsLeft > 0 && spotsLeft <= 3;
  const ctaLabel = showSendOfferCta ? "Send Offer" : isFull ? "Full" : "Book Now";
  const ctaDisabled = !showSendOfferCta && isFull;
  const stopLine = [item.destination, item.destinationState].filter(Boolean).join(" • ");

  return (
    <article className="group/card snap-start flex w-[252px] shrink-0 flex-col overflow-hidden rounded-sm border border-[var(--color-border)] bg-white  transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-sea-500)]/25  sm:w-[284px]">
      <Link href={href} className="relative block overflow-hidden" style={{ aspectRatio: "16/11" }}>
        {item.coverImageUrl ? (
          <img
            src={item.coverImageUrl}
            alt={item.title}
            className="size-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-emerald-800 to-teal-600" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        <span
          className={cn(
            "absolute left-0 top-3 rounded-r-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow-md",
            sourceBadge.classes
          )}
        >
          {sourceBadge.label}
        </span>

        <span className="absolute right-3 top-3 rounded-full bg-black/45 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
          {fillPct}% filled
        </span>

        {isAlmostFull && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-sea-500)] px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
            <Zap className="size-3" />
            Only {spotsLeft} left
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <p className="truncate text-xs text-slate-500">{durationLabel}</p>

          <div className="flex shrink-0 items-center gap-1">
            <Star className="size-3.5 fill-[var(--color-amber-500)] text-[var(--color-amber-500)]" />
            <span className="text-xs font-bold text-[var(--color-sea-700)]">{rating}</span>
            <span className="text-[10px] text-slate-400">({count})</span>
          </div>
        </div>

        <Link href={href}>
          <h3 className="line-clamp-2 min-h-[56px] text-[20px] font-bold leading-snug text-[var(--color-ink-950)] transition-colors hover:text-[var(--color-sea-700)] sm:text-lg">
            {item.title}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1">
          <MapPin className="size-3.5 shrink-0 text-[var(--color-sea-600)]" />
          <p className="truncate text-[11px] font-semibold text-[var(--color-ink-700)]">{stopLine || item.destination}</p>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-slate-400 line-through">{originalLabel}</span>
            <span className="rounded-full bg-[var(--color-sea-50)] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[var(--color-sea-700)]">
              SAVE {savingsLabel}
            </span>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xl font-extrabold text-[var(--color-ink-950)]">{budgetLabel}</span>
              <span className="ml-1 text-[11px] text-slate-500">/Adult</span>
            </div>

            <div className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface)] px-2 py-1 text-[11px] font-bold text-[var(--color-ink-700)]">
              <Users className="size-3.5 text-[var(--color-sea-600)]" />
              {item.joinedCount}/{item.groupSizeMax}
              <span className="text-slate-400">•</span>
              <span className="text-[var(--color-sea-700)]">{fillPct}%</span>
            </div>
          </div>
        </div>

        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[var(--color-sea-500)] transition-all" style={{ width: `${fillPct}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-[44px_1fr] gap-2.5">
          <Link
            href={`${href}#chat`}
            className="flex h-11 items-center justify-center rounded-sm border border-[var(--color-sea-500)]/35 bg-white text-[var(--color-sea-700)] transition hover:border-[var(--color-sea-500)] hover:bg-[var(--color-sea-50)] active:scale-[0.97]"
          >
            <MessageCircle className="size-4" />
          </Link>

          <Link
            href={href}
            aria-disabled={ctaDisabled}
            className={cn(
              "flex h-11 items-center justify-center rounded-sm text-sm font-extrabold text-white transition active:scale-[0.98]",
              ctaDisabled
                ? "pointer-events-none cursor-not-allowed bg-slate-100 text-slate-400"
                : "bg-[var(--color-amber-500)] shadow-sm hover:bg-[var(--color-amber-600)]"
            )}
          >
            <BookOpen className="mr-1.5 size-3.5 shrink-0" />
            {ctaLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function PackageCarousel({
  title,
  subtitle,
  filter,
  viewAllHref = "/discover",
  bg = "bg-white",
}: PackageCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<DiscoverItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getTrendingItems().then((data) => {
      if (cancelled) return;

      let filtered = data;
      if (filter?.destination) {
        const destinationKey = filter.destination.toLowerCase();
        filtered = filtered.filter((item) => item.destination?.toLowerCase().includes(destinationKey));
      }
      if (filter?.vibes) {
        filtered = filtered.filter((item) => matchesVibe(item, filter.vibes));
      }

      const fallbackSeed = `${title}-${filter?.destination ?? ""}-${filter?.vibes ?? ""}`;
      const resolved = filtered.length > 0 ? filtered.slice(0, 10) : rotateAndSlice(data, fallbackSeed, 8);
      setItems(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [filter?.destination, filter?.vibes, title]);

  const scroll = (dir: "left" | "right") =>
    ref.current?.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });

  if (items.length === 0) return null;

  return (
    <section className={cn("py-10", bg)}>
      <div className="mx-auto page-shell px-4">
        <div className="mb-5 flex items-end justify-between">
          <div>
            {subtitle && <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-600">{subtitle}</p>}
            <h2 className="mt-0.5 font-display text-xl font-black text-gray-950 sm:text-2xl">{title}</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => scroll("left")}
              className="hidden size-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600 sm:flex"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="hidden size-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600 sm:flex"
            >
              <ChevronRight className="size-4" />
            </button>
            <Link href={viewAllHref} className="ml-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500">
              View all →
            </Link>
          </div>
        </div>

        <div ref={ref} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3" style={{ scrollbarWidth: "none" }}>
          {items.map((item) => (
            <PackageCard key={`${item.originType}-${item.id}-${title}`} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
