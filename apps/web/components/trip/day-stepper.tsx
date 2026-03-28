"use client";

import { useMemo, useState } from "react";
import {
  MapPin,
  ChevronDown,
  Sunrise,
  Sun,
  Moon,
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
}

function getDayIcon(day: number) {
  const icons = [Sunrise, Sun, Moon];
  return icons[day % icons.length];
}

export function DayStepper({ days, totalDays }: DayStepperProps) {
  const allDayIndexes = useMemo(() => days.map((_, index) => index), [days]);
  const [expandedDays, setExpandedDays] = useState<number[]>(() => (days.length > 0 ? [0] : []));
  const visibleExpandedDays = useMemo(
    () => expandedDays.filter((index) => index < days.length),
    [days.length, expandedDays],
  );

  if (days.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-white/40 bg-[var(--color-surface-2)] p-6 text-center shadow-[var(--shadow-clay-inset)]">
        <MapPin className="mx-auto size-8 text-[var(--color-ink-400)]" />
        <p className="mt-2 text-sm text-[var(--color-ink-600)]">
          Detailed day-by-day itinerary will be shared soon.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Progress header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          {totalDays ?? days.length}-Day itinerary
        </p>
        <button
          type="button"
          onClick={() =>
            setExpandedDays(visibleExpandedDays.length === days.length ? [] : allDayIndexes)
          }
          className="text-[11px] font-semibold text-[var(--color-sea-700)] transition hover:text-[var(--color-sea-600)] sm:text-xs"
        >
          {visibleExpandedDays.length === days.length ? "Collapse all" : "Expand all"}
        </button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {days.map((day, index) => {
          const isExpanded = visibleExpandedDays.includes(index);
          const DayIcon = getDayIcon(index);
          const isFirst = index === 0;
          const isLast = index === days.length - 1;

          return (
            <div
              key={`${day.day}-${index}`}
              className="grid grid-cols-[2rem_minmax(0,1fr)] items-stretch gap-3 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-4"
            >
              <div className="flex min-h-full flex-col items-center self-stretch">
                {isFirst && (
                  <span className="mb-2 inline-flex rounded-full bg-[var(--color-sea-50)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)] sm:px-2.5 sm:py-1 sm:text-[9px]">
                    Start
                  </span>
                )}

                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 transition-all duration-300 sm:size-12",
                    isExpanded
                      ? "scale-105 border-[var(--color-sea-400)] bg-gradient-to-b from-[var(--color-sea-400)] to-[var(--color-sea-600)] text-white shadow-[var(--shadow-clay-sea)]"
                      : "border-white/60 bg-[var(--color-surface-raised)] text-[var(--color-ink-500)] shadow-[var(--shadow-clay-sm)]",
                  )}
                >
                  <span className="text-[10px] font-bold sm:text-sm">{day.day}</span>
                </div>

                {!isLast && (
                  <div className="mt-1.5 w-0.5 flex-1 rounded-full bg-gradient-to-b from-[var(--color-sea-300)] via-[var(--color-sea-200)] to-[var(--color-sea-100)] sm:mt-2" />
                )}

                {isLast && (
                  <span className="mt-2 inline-flex rounded-full bg-[var(--color-sunset-50)] px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)] sm:px-2.5 sm:py-1 sm:text-[9px]">
                    End
                  </span>
                )}
              </div>

              {/* Day card */}
              <button
                type="button"
                onClick={() =>
                  setExpandedDays((current) =>
                    current
                      .filter((item) => item < days.length)
                      .includes(index)
                      ? current.filter((item) => item !== index)
                      : [...current.filter((item) => item < days.length), index].sort((a, b) => a - b),
                  )
                }
                className={cn(
                  "min-w-0 w-full rounded-[var(--radius-md)] border text-left transition-all duration-300",
                  isExpanded
                    ? "border-[var(--color-sea-100)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-clay)]"
                    : "border-white/40 bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-inset)] hover:shadow-[var(--shadow-clay-sm)]",
                )}
              >
                <div className="flex items-center justify-between gap-2 p-2.5 sm:p-4">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                    <DayIcon
                      className={cn(
                        "size-3.5 shrink-0 sm:size-4",
                        isExpanded
                          ? "text-[var(--color-sea-600)]"
                          : "text-[var(--color-ink-400)]",
                      )}
                    />
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate font-display text-[12px] leading-5 transition-colors sm:text-base sm:leading-6",
                          isExpanded
                            ? "text-[var(--color-ink-950)]"
                            : "text-[var(--color-ink-700)]",
                        )}
                      >
                        Day {day.day}: {day.title}
                      </p>
                      {!isExpanded && day.description && (
                        <p className="mt-0.5 truncate text-[10px] text-[var(--color-ink-500)] sm:text-xs">
                          {day.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-[var(--color-ink-400)] transition-transform duration-300",
                      isExpanded && "rotate-180 text-[var(--color-sea-600)]",
                    )}
                  />
                </div>

                {/* Expanded content */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300",
                    isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0",
                  )}
                >
                  <div className="space-y-2.5 border-t border-[var(--color-line)] px-2.5 pb-2.5 pt-2 sm:space-y-3 sm:px-4 sm:pb-4 sm:pt-3">
                    {day.description && (
                      <p className="text-[12px] leading-5 text-[var(--color-ink-600)] sm:text-sm sm:leading-relaxed">
                        {day.description}
                      </p>
                    )}

                    {/* Highlights */}
                    {day.highlights && day.highlights.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                          Highlights
                        </p>
                        <ul className="space-y-1">
                          {day.highlights.map((h) => (
                            <li
                              key={h}
                              className="flex items-start gap-2 text-[12px] leading-5 text-[var(--color-ink-700)] sm:text-sm sm:leading-6"
                            >
                              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-sea-400)]" />
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Day meta chips */}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {day.meals && day.meals.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-sunset-50)] px-2 py-0.5 text-[8px] font-semibold text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)] sm:px-2.5 sm:py-1 sm:text-[10px]">
                          Meals: {day.meals.join(", ")}
                        </span>
                      )}
                      {day.accommodation && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-lavender-50)] px-2 py-0.5 text-[8px] font-semibold text-[var(--color-lavender-500)] shadow-[var(--shadow-clay-sm)] sm:px-2.5 sm:py-1 sm:text-[10px]">
                          Stay: {day.accommodation}
                        </span>
                      )}
                      {day.transport && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-sea-50)] px-2 py-0.5 text-[8px] font-semibold text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)] sm:px-2.5 sm:py-1 sm:text-[10px]">
                          {day.transport}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
