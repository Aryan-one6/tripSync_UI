"use client";

import { useMemo, useState, useCallback } from "react";
import {
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Car,
  BedDouble,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DayPlan {
  day: number;
  title: string;
  description?: string | null;
  highlights?: string[];
  meals?: string[];
  accommodation?: string | null;
  transport?: string | null;
}

interface DayStepperProps {
  days: DayPlan[];
  totalDays?: number;
  galleryUrls?: string[];
  destination?: string;
}

/* ── Mini image carousel used inside each expanded day ── */
function DayImageCarousel({
  images,
  label,
}: {
  images: string[];
  label: string;
}) {
  const [idx, setIdx] = useState(0);
  const total = images.length;

  const prev = useCallback(
    () => setIdx((i) => (i - 1 + total) % total),
    [total]
  );
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total]);

  if (total === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl">
      {/* Main image */}
      <div className="relative aspect-[16/7] w-full overflow-hidden rounded-xl bg-slate-200">
        <img
          src={images[idx]}
          alt={`${label} — photo ${idx + 1}`}
          className="size-full object-cover transition-opacity duration-300"
        />

        {/* Overlay bottom */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent px-4 pb-3 pt-8">
          <p className="text-xs font-semibold text-white drop-shadow">{label}</p>
          <p className="text-[10px] text-white/70">
            {idx + 1}/{total}
          </p>
        </div>

        {/* Nav arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            >
              <ChevronRight className="size-4" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {total > 1 && (
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {images.slice(0, 8).map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={cn(
                "relative size-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition",
                i === idx
                  ? "border-orange-500"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              <img
                src={url}
                alt=""
                className="size-full object-cover"
              />
              {i === 7 && total > 8 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                  <span className="text-[10px] font-bold text-white">
                    +{total - 8}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Hero destination carousel at top of itinerary ── */
function DestinationHero({
  images,
  destination,
  totalDays,
}: {
  images: string[];
  destination?: string;
  totalDays: number;
}) {
  const [idx, setIdx] = useState(0);
  const total = images.length;
  const prev = useCallback(
    () => setIdx((i) => (i - 1 + total) % total),
    [total]
  );
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total]);

  if (total === 0 || !destination) return null;

  return (
    <div className="relative mb-5 aspect-[16/7] w-full overflow-hidden rounded-2xl bg-slate-200 shadow-md">
      <img
        src={images[idx]}
        alt={destination}
        className="size-full object-cover transition-opacity duration-500"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {/* Bottom-left: "N Days in Destination" */}
      <div className="absolute bottom-4 left-5">
        <div className="flex items-end gap-2">
          <span className="font-display text-5xl font-black leading-none text-white">
            {totalDays}
          </span>
          <div className="mb-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
              Days in
            </p>
            <p className="text-xl font-bold text-white leading-tight">
              {destination}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom-right: thumbnail strip + counter */}
      {total > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
          {images.slice(0, 3).map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className={cn(
                "size-8 overflow-hidden rounded-full border-2 transition",
                i === idx ? "border-white" : "border-white/40"
              )}
            >
              <img src={url} alt="" className="size-full object-cover" />
            </button>
          ))}
          {total > 3 && (
            <div className="flex size-8 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
              +{total - 3}
            </div>
          )}
          <span className="ml-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            {idx + 1}/{total}
          </span>
        </div>
      )}

      {/* Nav arrows */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}
    </div>
  );
}

/* ── Main DayStepper ── */
export function DayStepper({
  days,
  totalDays,
  galleryUrls = [],
  destination,
}: DayStepperProps) {
  const [expandedDays, setExpandedDays] = useState<Set<number>>(
    () => new Set(days.length > 0 ? [0] : [])
  );

  if (days.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-10 text-center">
        <MapPin className="size-8 text-slate-300" />
        <p className="mt-2 text-sm text-slate-400">
          Detailed itinerary will be shared by the agency soon.
        </p>
      </div>
    );
  }

  const numDays = totalDays ?? days.length;
  const allExpanded = expandedDays.size === days.length;

  function toggle(index: number) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  /* Distribute gallery images across days */
  const imagesPerDay = useMemo(() => {
    if (galleryUrls.length === 0) return days.map(() => [] as string[]);
    const perDay = Math.max(1, Math.floor(galleryUrls.length / days.length));
    return days.map((_, i) => {
      const start = i * perDay;
      // Last day gets any remainder
      const end =
        i === days.length - 1 ? galleryUrls.length : start + perDay;
      return galleryUrls.slice(start, end);
    });
  }, [days, galleryUrls]);

  return (
    <div>
      {/* ── Destination hero image carousel ── */}
      <DestinationHero
        images={galleryUrls}
        destination={destination}
        totalDays={numDays}
      />

      {/* ── Controls row ── */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          {numDays}-Day Itinerary
        </p>
        <button
          type="button"
          onClick={() =>
            setExpandedDays(
              allExpanded ? new Set() : new Set(days.map((_, i) => i))
            )
          }
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition"
        >
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {/* ── Accordion list ── */}
      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {days.map((day, index) => {
          const isOpen = expandedDays.has(index);
          const dayImages = imagesPerDay[index];

          return (
            <div key={`day-${day.day}-${index}`}>
              {/* Row header */}
              <button
                type="button"
                onClick={() => toggle(index)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/80"
              >
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider transition-all",
                    isOpen
                      ? "bg-orange-500 text-white"
                      : "bg-orange-100 text-orange-600"
                  )}
                >
                  DAY {day.day}
                </span>
                <span
                  className={cn(
                    "flex-1 text-sm font-semibold leading-snug",
                    isOpen ? "text-slate-900" : "text-slate-700"
                  )}
                >
                  {day.title}
                </span>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-slate-400 transition-transform duration-200",
                    isOpen && "rotate-180 text-orange-500"
                  )}
                />
              </button>

              {/* Expanded body */}
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  isOpen ? "max-h-[1200px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="space-y-4 border-t border-slate-100 bg-slate-50/40 px-4 pb-5 pt-4">

                  {/* Description */}
                  {day.description && (
                    <p className="text-sm leading-relaxed text-slate-600">
                      {day.description}
                    </p>
                  )}

                  {/* Highlight tags */}
                  {day.highlights && day.highlights.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {day.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 shadow-sm"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Transfer section */}
                  {day.transport && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Car className="size-3.5 text-slate-400" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Transfer
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-800">
                          {day.transport}
                        </p>
                        {/* Route visual */}
                        {day.transport.includes("→") && (
                          <div className="mt-2 space-y-1.5">
                            {day.transport.split("→").map((leg, li, arr) => (
                              <div key={li} className="flex items-start gap-2.5">
                                <div className="mt-1 flex flex-col items-center gap-1">
                                  <div
                                    className={cn(
                                      "size-2 rounded-full",
                                      li === 0
                                        ? "bg-orange-500"
                                        : li === arr.length - 1
                                        ? "bg-emerald-500"
                                        : "bg-slate-400"
                                    )}
                                  />
                                  {li < arr.length - 1 && (
                                    <div className="h-4 w-px bg-slate-200" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                    {li === 0 ? "From" : "To"}
                                  </p>
                                  <p className="text-xs font-semibold text-slate-700">
                                    {leg.trim()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stay section */}
                  {day.accommodation && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <BedDouble className="size-3.5 text-slate-400" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Stay At
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-slate-800">
                        {day.accommodation}
                      </p>
                      {/* Accommodation images */}
                      {dayImages.length > 0 && (
                        <div className="mt-3">
                          <DayImageCarousel
                            images={dayImages}
                            label={day.accommodation}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* If no accommodation but has images, still show them */}
                  {!day.accommodation && dayImages.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <DayImageCarousel images={dayImages} label={day.title} />
                    </div>
                  )}

                  {/* Meals */}
                  {day.meals && day.meals.length > 0 && (
                    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <Utensils className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Meals Included
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {day.meals.map((m, mi) => (
                            <span
                              key={mi}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700"
                            >
                              🍽 {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
