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
                  "min-w-0 w-full rounded-xl border-2 text-left transition-all duration-300",
                  isExpanded
                    ? "border-[var(--color-sea-300)] bg-white shadow-md"
                    : "border-[var(--color-ink-100)] bg-[var(--color-surface-2)] shadow-sm hover:shadow-md hover:border-[var(--color-sea-200)]",
                )}
              >
                <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <DayIcon
                      className={cn(
                        "size-5 shrink-0 sm:size-5",
                        isExpanded
                          ? "text-[var(--color-sea-600)]"
                          : "text-[var(--color-sea-400)]",
                      )}
                    />
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "truncate font-display text-sm font-semibold leading-5 transition-colors sm:text-base sm:leading-6",
                          isExpanded
                            ? "text-[var(--color-ink-950)]"
                            : "text-[var(--color-ink-800)]",
                        )}
                      >
                        Day {day.day}: {day.title}
                      </p>
                      {!isExpanded && day.description && (
                        <p className="mt-1 truncate text-xs text-[var(--color-ink-500)] sm:text-sm">
                          {day.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-[var(--color-ink-400)] transition-transform duration-300",
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
                  <div className="space-y-4 border-t border-[var(--color-ink-100)] px-3 pb-4 pt-4 sm:px-5 sm:pb-5 sm:space-y-5">
                    {/* Day description - large and prominent */}
                    {day.description && (
                      <p className="text-sm leading-relaxed text-[var(--color-ink-700)] sm:text-base">
                        {day.description}
                      </p>
                    )}

                    {/* Highlights Section - better design */}
                    {day.highlights && day.highlights.length > 0 && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-ink-600)]">
                          Highlights
                        </h4>
                        <ul className="space-y-2">
                          {day.highlights.map((h) => (
                            <li
                              key={h}
                              className="flex items-start gap-3 text-sm text-[var(--color-ink-700)]"
                            >
                              <span className="mt-2 size-2 shrink-0 rounded-full bg-[var(--color-sea-500)]" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Day Details Grid */}
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      {day.meals && day.meals.length > 0 && (
                        <div className="rounded-lg bg-[var(--color-sunset-50)] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-sunset-700)]">Meals</p>
                          <p className="mt-1.5 text-sm text-[var(--color-sunset-900)]">{day.meals.join(" • ")}</p>
                        </div>
                      )}
                      {day.accommodation && (
                        <div className="rounded-lg bg-[var(--color-lavender-50)] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-lavender-600)]">Stay</p>
                          <p className="mt-1.5 text-sm text-[var(--color-lavender-900)]">{day.accommodation}</p>
                        </div>
                      )}
                      {day.transport && (
                        <div className="rounded-lg bg-[var(--color-sea-50)] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-sea-700)]">Transfer</p>
                          <p className="mt-1.5 text-sm text-[var(--color-sea-900)]">{day.transport}</p>
                        </div>
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
