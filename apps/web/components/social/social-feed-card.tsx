import Link from "next/link";
import { ArrowUpRight, CalendarRange, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardInset } from "@/components/ui/card";
import { TripVisual } from "@/components/cards/trip-visual";
import type { SocialFeedItem } from "@/lib/api/types";
import { formatCompactDate, formatCurrency, initials } from "@/lib/format";

function formatVerificationLabel(profileType: "traveler" | "agency", verification: string | null | undefined) {
  if (profileType === "traveler") {
    if (verification === "TRUSTED") return "Trusted traveler";
    if (verification === "VERIFIED") return "Verified traveler";
    return "Basic traveler";
  }

  if (verification === "verified") return "Verified agency";
  if (verification === "under_review") return "Agency under review";
  return "Agency pending";
}

export function SocialFeedCard({ item }: { item: SocialFeedItem }) {
  const isPlan = item.originType === "plan";
  const detailHref = isPlan ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const profileHref = `/profile/${item.author.handle}`;
  const listingLabel = isPlan ? "Plan" : "Package";
  const joinedLabel = `${item.joinedCount}/${item.groupSizeMax} joined`;
  const priceLabel =
    isPlan && item.priceHigh && item.priceLow && item.priceLow !== item.priceHigh
      ? `${formatCurrency(item.priceLow)} - ${formatCurrency(item.priceHigh)}`
      : formatCurrency(item.priceLow);

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-[var(--color-line)] px-5 py-4">
        <div className="flex items-start gap-3">
          <Link
            href={profileHref}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-sm font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]"
          >
            {initials(item.author.name)}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={profileHref}
                  className="truncate text-sm font-semibold text-[var(--color-ink-950)] transition hover:text-[var(--color-sea-700)]"
                >
                  {item.author.name}
                </Link>
                <p className="truncate text-xs text-[var(--color-ink-500)]">
                  @{item.author.handle} · {formatVerificationLabel(item.author.profileType, item.author.verification as string)}
                </p>
              </div>
              <Link
                href={detailHref}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-ink-500)] shadow-[var(--shadow-clay-sm)] transition hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-sea-700)]"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Link href={detailHref} className="block">
        <TripVisual
          title={item.title}
          eyebrow={item.destination}
          coverImageUrl={item.coverImageUrl ?? undefined}
          className="min-h-60 rounded-none"
        />
      </Link>

      <div className="space-y-4 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={isPlan ? "lavender" : "sea"}>{listingLabel}</Badge>
          <Badge variant="outline">{isPlan ? "Community-created" : "Agency-created"}</Badge>
        </div>

        <div>
          <Link href={detailHref}>
            <h2 className="font-display text-2xl text-[var(--color-ink-950)] transition hover:text-[var(--color-sea-700)]">
              {item.title}
            </h2>
          </Link>
          {item.excerpt ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--color-ink-600)]">
              {item.excerpt}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <CardInset className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
              Location
            </p>
            <p className="flex items-center gap-1.5 text-sm text-[var(--color-ink-800)]">
              <MapPin className="size-3.5 text-[var(--color-sea-600)]" />
              <span className="line-clamp-1">
                {item.destination}
                {item.destinationState ? `, ${item.destinationState}` : ""}
              </span>
            </p>
          </CardInset>
          <CardInset className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
              Dates
            </p>
            <p className="flex items-center gap-1.5 text-sm text-[var(--color-ink-800)]">
              <CalendarRange className="size-3.5 text-[var(--color-sea-600)]" />
              {item.startDate ? formatCompactDate(item.startDate) : "Flexible"}
            </p>
          </CardInset>
          <CardInset className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
              Price
            </p>
            <p className="text-sm font-semibold text-[var(--color-sea-700)]">{priceLabel}</p>
          </CardInset>
        </div>

        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-white/50 bg-[var(--color-surface-2)] px-4 py-3 shadow-[var(--shadow-clay-inset)]">
          <div className="flex items-center gap-2 text-sm text-[var(--color-ink-700)]">
            <Users className="size-4 text-[var(--color-sea-600)]" />
            {joinedLabel}
          </div>
          <Link href={profileHref} className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-500)] transition hover:text-[var(--color-sea-700)]">
            @{item.author.handle}
          </Link>
        </div>
      </div>
    </Card>
  );
}
