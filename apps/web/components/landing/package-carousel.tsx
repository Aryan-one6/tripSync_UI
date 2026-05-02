"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star, MapPin, Users, Calendar } from "lucide-react";
import { getTrendingItems, getSocialFeed } from "@/lib/api/public";
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
  const price = formatCurrency(item.priceLow ?? item.priceHigh ?? null);
  const { rating, count } = seedRating(item.id);
  const fillPct = Math.min(100, Math.round((item.joinedCount / item.groupSizeMax) * 100));

  return (
    <Link
      href={href}
      className="group snap-start flex-shrink-0 w-56 sm:w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl block"
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ height: "160px" }}>
        {item.coverImageUrl ? (
          <img src={item.coverImageUrl} alt={item.title}
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
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
      </div>

      {/* Body */}
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-bold text-slate-900 leading-snug">{item.title}</h3>
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPin className="size-3 text-slate-400" />
          <span className="truncate">{item.destination}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <span className="text-sm font-black text-slate-900">{price}</span>
            <span className="text-[10px] text-slate-400 ml-1">/person</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Users className="size-3" />
            {item.joinedCount}/{item.groupSizeMax}
          </div>
        </div>
      </div>
    </Link>
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
      <div className="mx-auto max-w-7xl px-4">
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
