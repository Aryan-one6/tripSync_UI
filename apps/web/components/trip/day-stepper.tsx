"use client";

import { useMemo, useState } from "react";
import { MapPin, ChevronDown, Coffee, Tent, Car, Zap, ArrowRight } from "lucide-react";
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
}

const DAY_COLORS = [
  { pill: "bg-emerald-600 text-white", border: "border-emerald-200", accent: "text-emerald-700", bg: "bg-emerald-50" },
  { pill: "bg-sky-600 text-white", border: "border-sky-200", accent: "text-sky-700", bg: "bg-sky-50" },
  { pill: "bg-violet-600 text-white", border: "border-violet-200", accent: "text-violet-700", bg: "bg-violet-50" },
  { pill: "bg-amber-600 text-white", border: "border-amber-200", accent: "text-amber-700", bg: "bg-amber-50" },
  { pill: "bg-rose-600 text-white", border: "border-rose-200", accent: "text-rose-700", bg: "bg-rose-50" },
  { pill: "bg-teal-600 text-white", border: "border-teal-200", accent: "text-teal-700", bg: "bg-teal-50" },
];

export function DayStepper({ days, totalDays }: DayStepperProps) {
  const allDayIndexes = useMemo(() => days.map((_, i) => i), [days]);
  const [expandedDays, setExpandedDays] = useState<number[]>(() => (days.length > 0 ? [0] : []));
  const visibleExpanded = useMemo(
    () => expandedDays.filter((i) => i < days.length),
    [days.length, expandedDays],
  );

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        <MapPin className="mx-auto size-10 text-slate-300" />
        <p className="mt-3 text-sm text-slate-500">
          Detailed day-by-day itinerary will be shared soon.
        </p>
      </div>
    );
  }

  function toggleDay(index: number) {
    setExpandedDays((prev) => {
      const filtered = prev.filter((i) => i < days.length);
      return filtered.includes(index)
        ? filtered.filter((i) => i !== index)
        : [...filtered, index].sort((a, b) => a - b);
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
            {totalDays ?? days.length}-Day Itinerary
          </span>
        </div>
        <button
          type="button"
          onClick={() =>
            setExpandedDays(visibleExpanded.length === days.length ? [] : allDayIndexes)
          }
          className="flex items-center gap-1 text-[12px] font-semibold text-emerald-700 transition hover:text-emerald-600"
        >
          {visibleExpanded.length === days.length ? "Collapse all" : "Expand all"}
          <ArrowRight className="size-3" />
        </button>
      </div>

      {/* Day list */}
      <div className="relative space-y-0">
        {/* Vertical connector line */}
        <div className="absolute left-[18px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-emerald-300 via-slate-200 to-slate-200 md:left-[22px]" />

        {days.map((day, index) => {
          const isExpanded = visibleExpanded.includes(index);
          const isFirst = index === 0;
          const isLast = index === days.length - 1;
          const color = DAY_COLORS[index % DAY_COLORS.length];

          return (
            <div key={`day-${day.day}-${index}`} className="relative pb-4 last:pb-0">
              <div className="flex gap-4 md:gap-5">
                {/* Day pill + connector */}
                <div className="relative z-10 flex flex-col items-center">
                  {isFirst && (
                    <span className="mb-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-700">
                      Start
                    </span>
                  )}
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-black shadow-sm transition-all duration-200 md:size-11",
                      isExpanded ? color.pill + " scale-105 shadow-md" : "bg-white border-2 border-slate-200 text-slate-600"
                    )}
                  >
                    {day.day}
                  </div>
                  {isLast && (
                    <span className="mt-1.5 rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-rose-600">
                      End
                    </span>
                  )}
                </div>

                {/* Day card */}
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={cn(
                      "w-full overflow-hidden rounded-xl border text-left transition-all duration-300",
                      isExpanded
                        ? cn("border-2 shadow-md", color.border, "bg-white")
                        : "border border-slate-200 bg-white shadow-sm hover:border-emerald-200 hover:shadow-md"
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            isExpanded ? color.pill : "bg-slate-100 text-slate-600"
                          )}>
                            Day {day.day}
                          </span>
                          <p className={cn(
                            "truncate text-sm font-bold leading-tight",
                            isExpanded ? "text-slate-900" : "text-slate-700"
                          )}>
                            {day.title}
                          </p>
                        </div>
                        {!isExpanded && day.description && (
                          <p className="mt-1 truncate text-xs text-slate-500 pl-0.5">
                            {day.description}
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-slate-400 transition-transform duration-300",
                          isExpanded && cn("rotate-180", color.accent)
                        )}
                      />
                    </div>

                    {/* Expanded content */}
                    <div className={cn(
                      "overflow-hidden transition-all duration-300",
                      isExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                    )}>
                      <div className={cn("border-t px-4 pb-5 pt-4 space-y-4", color.border)}>
                        {day.description && (
                          <p className="text-sm leading-relaxed text-slate-700">{day.description}</p>
                        )}

                        {day.highlights && day.highlights.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Highlights</p>
                            <ul className="space-y-2">
                              {day.highlights.map((h, hi) => (
                                <li key={hi} className="flex items-start gap-2.5 text-sm text-slate-700">
                                  <Zap className={cn("mt-0.5 size-3.5 shrink-0", color.accent)} />
                                  <span>{h}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(day.meals?.length || day.accommodation || day.transport) && (
                          <div className="grid gap-2 sm:grid-cols-3">
                            {day.meals && day.meals.length > 0 && (
                              <div className={cn("flex items-start gap-2 rounded-xl p-3", color.bg)}>
                                <Coffee className={cn("mt-0.5 size-4 shrink-0", color.accent)} />
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Meals</p>
                                  <p className="mt-0.5 text-xs font-semibold text-slate-800">{day.meals.join(" · ")}</p>
                                </div>
                              </div>
                            )}
                            {day.accommodation && (
                              <div className={cn("flex items-start gap-2 rounded-xl p-3", color.bg)}>
                                <Tent className={cn("mt-0.5 size-4 shrink-0", color.accent)} />
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Stay</p>
                                  <p className="mt-0.5 text-xs font-semibold text-slate-800">{day.accommodation}</p>
                                </div>
                              </div>
                            )}
                            {day.transport && (
                              <div className={cn("flex items-start gap-2 rounded-xl p-3", color.bg)}>
                                <Car className={cn("mt-0.5 size-4 shrink-0", color.accent)} />
                                <div>
                                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Transfer</p>
                                  <p className="mt-0.5 text-xs font-semibold text-slate-800">{day.transport}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* End of trip */}
      <div className="mt-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
        <p className="font-display text-base italic text-slate-400">End of Trip</p>
        <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
      </div>
    </div>
  );
}
