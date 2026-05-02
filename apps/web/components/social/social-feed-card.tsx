"use client";

import Link from "next/link";
import { CalendarRange, Share2, Users } from "lucide-react";
import type { SocialFeedItem } from "@/lib/api/types";
import { formatCompactDate, formatCurrency, initials } from "@/lib/format";
import { TripVisual } from "@/components/cards/trip-visual";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
      <div
        className="h-full rounded-full bg-[var(--color-sea-500)] transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function buildWhatsAppUrl(url: string, text: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

export function SocialFeedCard({ item }: { item: SocialFeedItem }) {
  const isPlan = item.originType === "plan";
  const detailHref = isPlan ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const profileHref = `/profile/${item.author.handle}`;
  const joinedCount = item.joinedCount ?? 0;
  const groupMax = item.groupSizeMax ?? 0;

  const priceLabel =
    item.priceLow
      ? `From ${formatCurrency(item.priceLow)}`
      : null;

  return (
    <article className="overflow-hidden rounded-xl bg-[var(--color-surface-raised)] shadow-[var(--shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--shadow-md)]">
      {/* Image area — 16:9 with overlay badges */}
      <Link href={detailHref} className="relative block aspect-[16/9] overflow-hidden rounded-t-xl">
        <TripVisual
          title={item.title}
          eyebrow={item.destination}
          coverImageUrl={item.coverImageUrl ?? undefined}
          className="h-full w-full rounded-none"
        />
        {/* Destination badge — bottom left */}
        <span className="absolute bottom-3 left-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          {item.destination}
          {item.destinationState ? `, ${item.destinationState}` : ""}
        </span>
        {/* Price badge — bottom right */}
        {priceLabel ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
            {priceLabel}
          </span>
        ) : null}
      </Link>

      {/* Content area */}
      <div className="p-4">
        {/* Author row */}
        <div className="mb-3 flex items-center gap-2.5">
          <Link
            href={profileHref}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-xs font-bold text-[var(--color-sea-700)]"
          >
            {initials(item.author.name)}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={profileHref}
              className="text-sm font-semibold text-[var(--color-ink-900)] transition hover:text-[var(--color-sea-700)]"
            >
              {item.author.name}
            </Link>
            <p className="text-[11px] text-[var(--color-ink-500)]">
              @{item.author.handle}
            </p>
          </div>
        </div>

        {/* Title */}
        <Link href={detailHref}>
          <h2 className="truncate font-semibold text-[var(--color-ink-950)] transition hover:text-[var(--color-sea-700)]">
            {item.title}
          </h2>
        </Link>

        {/* Date row */}
        {item.startDate ? (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-ink-500)]">
            <CalendarRange className="size-3.5" />
            {formatCompactDate(item.startDate)}
            {item.endDate ? ` → ${formatCompactDate(item.endDate)}` : ""}
          </p>
        ) : null}

        {/* Group progress */}
        {groupMax > 0 ? (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-ink-500)]">
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {joinedCount}/{groupMax} joined
              </span>
              <span>{Math.round((joinedCount / groupMax) * 100)}%</span>
            </div>
            <ProgressBar value={joinedCount} max={groupMax} />
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2.5">
        {/* Origin type label */}
        <span
          className={`text-xs font-semibold ${isPlan ? "text-[var(--color-lavender-500)]" : "text-[var(--color-sea-600)]"
            }`}
        >
          {isPlan ? "Travel Plan" : "Agency Package"}
        </span>

        {/* Share buttons */}

      </div>
    </article>
  );
}
