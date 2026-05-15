"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star, MapPin, Users, BookOpen, MessageCircle } from "lucide-react";
import { getTrendingItems } from "@/lib/api/public";
import type { DiscoverItem } from "@/lib/api/types";
import { formatCurrency, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

function hash(s: string) { return Array.from(s).reduce((t, c) => t + c.charCodeAt(0), 0); }
function seedRating(id: string) {
  const n = hash(id);
  return { rating: (3.8 + (n % 13) * 0.1).toFixed(1), count: 12 + (n % 98) };
}

function PackageCard({ item }: { item: DiscoverItem }) {
  const href = item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const dur = formatDuration(item.startDate, item.endDate);
  const durLabel = dur ? `${dur.days}D / ${dur.nights}N` : "Flexible";
  const currentPriceValue = item.priceLow ?? item.priceHigh ?? null;
  const fallbackOriginal =
    typeof currentPriceValue === "number" ? currentPriceValue + 1500 : null;
  const originalPriceValue = item.priceHigh ?? fallbackOriginal;
  const savingsValue =
    typeof originalPriceValue === "number" && typeof currentPriceValue === "number"
      ? Math.max(0, originalPriceValue - currentPriceValue)
      : null;
  const currentPrice = formatCurrency(currentPriceValue);
  const originalPrice = formatCurrency(originalPriceValue);
  const savingsLabel = formatCurrency(savingsValue);
  const { rating } = seedRating(item.id);
  const fillPct = Math.min(100, Math.round((item.joinedCount / item.groupSizeMax) * 100));

  return (
    <article className="group/card snap-start flex w-[252px] flex-shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:w-[284px] sm:min-h-[390px]">
      {/* Image */}
      <Link href={href} className="relative block overflow-hidden" style={{ height: "188px" }}>
        {item.coverImageUrl ? (
          <img src={item.coverImageUrl} alt={item.title}
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover/card:scale-105" loading="lazy" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-800 to-teal-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Rating */}
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 backdrop-blur-sm">
          <Star className="size-3 fill-amber-400 text-amber-400" />
          <span className="text-[11px] font-bold text-white">{rating}</span>
        </div>

        {/* Duration badge */}
        <div className="absolute left-2 bottom-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          {durLabel}
        </div>

        {/* Fill bar */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/20">
          <div className="h-0.5 bg-emerald-400" style={{ width: `${fillPct}%` }} />
        </div>
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-3.5">
        <Link href={href} className="line-clamp-2 text-[1.06rem] font-bold leading-snug text-slate-900 hover:text-emerald-700">
          {item.title}
        </Link>
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="size-3 text-slate-400" />
          <span className="truncate">{item.destination}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 line-through">{originalPrice}</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                SAVE {savingsLabel}
              </span>
            </div>
            <div>
              <span className="text-[1.65rem] font-black leading-none text-slate-900">{currentPrice}</span>
              <span className="ml-1 text-[12px] text-slate-500">/Adult</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Users className="size-3" />
            {item.joinedCount}/{item.groupSizeMax}
          </div>
        </div>

        <div className="mt-auto pt-4">
          <div className="grid grid-cols-2 gap-2.5">
            <Link
              href={`${href}#chat`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500 bg-white py-2.5 text-xs font-semibold text-emerald-500 transition hover:border-emerald-500 hover:bg-emerald-500 hover:text-emerald-600"
            >
              <MessageCircle className="size-3.5 shrink-0" />
              Chat
            </Link>
            <Link
              href={href}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-600)]"
            >
              <BookOpen className="size-3.5 shrink-0" />
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

interface PackageCarouselProps {
  title: string;
  subtitle?: string;
  filter?: { vibes?: string; destination?: string };
  viewAllHref?: string;
  bg?: string;
}

export function PackageCarousel({ title, subtitle, filter, viewAllHref = "/discover", bg = "bg-white" }: PackageCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<DiscoverItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void getTrendingItems().then(data => {
      if (cancelled) return;
      let filtered = data;
      if (filter?.destination) filtered = filtered.filter(d => d.destination?.toLowerCase().includes(filter.destination!.toLowerCase()));
      if (filter?.vibes) filtered = filtered.filter(d => d.vibes?.some(v => v.toLowerCase().includes(filter.vibes!.toLowerCase())));
      setItems(filtered.length > 0 ? filtered : data.slice(0, 8));
    });
    return () => { cancelled = true; };
  }, [filter?.destination, filter?.vibes]);

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
            <button onClick={() => scroll("left")} className="hidden size-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600 sm:flex">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => scroll("right")} className="hidden size-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600 sm:flex">
              <ChevronRight className="size-4" />
            </button>
            <Link href={viewAllHref} className="ml-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500">View all →</Link>
          </div>
        </div>

        <div ref={ref} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3" style={{ scrollbarWidth: "none" }}>
          {items.map((item) => <PackageCard key={`${item.originType}-${item.id}`} item={item} />)}
        </div>
      </div>
    </section>
  );
}
