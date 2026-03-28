import Link from "next/link";
import { ArrowUpRight, MapPin, Users, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { WhatsAppShareButton } from "@/components/ui/whatsapp-share-button";
import { formatCurrency, formatDateRange, formatVibes } from "@/lib/format";
import type { DiscoverItem } from "@/lib/api/types";
import { TripVisual } from "@/components/cards/trip-visual";
import { buildWhatsAppShareHref } from "@/lib/share";

export function DiscoverCard({ item }: { item: DiscoverItem }) {
  const href =
    item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const shareHref = buildWhatsAppShareHref(
    `Check this TravellersIn ${item.originType}: ${item.title}`,
    href,
  );
  const fillPercent = Math.round((item.joinedCount / Math.max(item.groupSizeMax, 1)) * 100);
  const rawVibes = item.vibes ?? [];
  const vibes = formatVibes(rawVibes);
  const extraVibesCount = Math.max(0, rawVibes.length - 3);
  const isPlan = item.originType === "plan";
  const listingLabel = isPlan ? "Community plan" : "Agency package";
  const sourceLabel = isPlan ? "Traveler-created" : "Agency-created";

  return (
    <Card className="group h-full p-0 overflow-hidden hover:shadow-[var(--shadow-clay-lg)] hover:-translate-y-1">
      <Link href={href} className="block">
        {/* Visual header */}
        <TripVisual
          title={item.title}
          eyebrow={listingLabel}
          coverImageUrl={item.coverImageUrl ?? undefined}
          className="min-h-40 sm:min-h-48 rounded-none rounded-t-[var(--radius-lg)]"
        />

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={isPlan ? "sea" : "sunset"}>{listingLabel}</Badge>
            <Badge variant="outline">{sourceLabel}</Badge>
          </div>

          {/* Title & location */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg text-[var(--color-ink-950)] sm:text-xl line-clamp-1">
                {item.title}
              </h3>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-ink-600)] sm:text-sm">
                <MapPin className="size-3.5 shrink-0" />
                <span className="line-clamp-1">
                  {item.destination}
                  {item.destinationState ? `, ${item.destinationState}` : ""}
                </span>
              </div>
            </div>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-sm)] transition-all group-hover:shadow-[var(--shadow-clay)] group-hover:bg-[var(--color-sea-50)]">
              <ArrowUpRight className="size-4 text-[var(--color-ink-500)] transition group-hover:text-[var(--color-sea-600)]" />
            </div>
          </div>

          {/* Date & Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3 shadow-[var(--shadow-clay-inset)]">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-[var(--color-ink-500)]">
                <Calendar className="size-3" />
                Dates
              </div>
              <p className="mt-1 text-xs font-medium text-[var(--color-ink-700)] sm:text-sm">
                {formatDateRange(item.startDate, item.endDate)}
              </p>
            </div>
            <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3 shadow-[var(--shadow-clay-inset)]">
              <p className="text-[10px] uppercase tracking-widest text-[var(--color-ink-500)]">
                From
              </p>
              <p className="mt-1 text-base font-bold text-[var(--color-sea-700)] sm:text-lg">
                {formatCurrency(item.priceLow)}
              </p>
            </div>
          </div>

          {/* Group fill bar */}
          <div className="rounded-[var(--radius-md)] border border-white/50 bg-[var(--color-surface-2)] p-3 shadow-[var(--shadow-clay-inset)]">
            <div className="flex items-center justify-between text-xs text-[var(--color-ink-600)]">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" />
                {item.joinedCount}/{item.groupSizeMax} joined
              </span>
              <span>{item.groupSizeMin}-{item.groupSizeMax} seats</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface)] shadow-[var(--shadow-clay-inset)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)] transition-all duration-500"
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>

          {/* Vibes */}
          <div className="flex flex-wrap gap-1.5">
            {vibes.slice(0, 3).map((vibe) => (
              <Badge key={vibe} variant="sea">{vibe}</Badge>
            ))}
            {extraVibesCount > 0 && (
              <Badge variant="outline">+{extraVibesCount}</Badge>
            )}
          </div>
        </div>
      </Link>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] px-4 py-3 sm:px-5">
        <Link
          href={href}
          className="text-sm font-semibold text-[var(--color-sea-700)] transition hover:text-[var(--color-sea-500)]"
        >
          View details
        </Link>
        <WhatsAppShareButton href={shareHref} label="Share" size="sm" />
      </div>
    </Card>
  );
}
