"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Compass,
  MapPin,
  Mountain,
  Sunrise,
  Users,
  Star,
  MessageCircle,
  Waves,
  TreePine,
  Flame,
  Zap,
} from "lucide-react";
import { formatCurrency, formatDuration, formatDateRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { useTransition } from "react";
import type { DiscoverItem } from "@/lib/api/types";
import type { GroupMember } from "@/lib/api/types";

const palettes = [
  { gradient: "from-teal-900 via-teal-700 to-emerald-500", Icon: Mountain },
  { gradient: "from-orange-900 via-emerald-700 to-orange-500", Icon: Sunrise },
  { gradient: "from-blue-900 via-sky-700 to-cyan-500", Icon: Waves },
  { gradient: "from-green-900 via-emerald-700 to-lime-500", Icon: TreePine },
  { gradient: "from-violet-900 via-purple-700 to-pink-500", Icon: Compass },
  { gradient: "from-red-900 via-rose-700 to-orange-500", Icon: Flame },
];

function hash(input: string) {
  return Array.from(input).reduce((t, c) => t + c.charCodeAt(0), 0);
}

function seedRating(id: string) {
  const n = hash(id);
  return {
    rating: (3.8 + (n % 13) * 0.1).toFixed(1),
    count: 12 + (n % 98),
  };
}

function seedSavings(id: string, price: number | null) {
  const n = hash(id);
  const base = price ?? 15000;
  const saveAmt = Math.round((base * (10 + (n % 20))) / 100 / 250) * 250;
  return { saveAmt, originalPrice: base + saveAmt };
}

export function DiscoverCard({ item }: { item: DiscoverItem }) {
  const { session, apiFetchWithAuth } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const href = item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const isPlan = item.originType === "plan";
  const sourceBadge = isPlan
    ? { label: "Community Plan", classes: "bg-amber-500 text-white" }
    : { label: "Agency Package", classes: "bg-violet-500 text-white" };
  const isAgencyViewer = session?.role === "agency_admin";
  const showSendOfferCta = isAgencyViewer && isPlan;
  const dur = formatDuration(item.startDate, item.endDate);
  const durLabel = dur ? `${dur.days} days & ${dur.nights} nights` : "Flexible dates";
  const budgetLabel = formatCurrency(item.priceLow ?? item.priceHigh ?? null);
  const rawPrice = item.priceLow ?? item.priceHigh ?? null;
  const { saveAmt, originalPrice } = seedSavings(item.id, rawPrice);
  const originalLabel = formatCurrency(originalPrice);
  const savingsLabel = formatCurrency(saveAmt);
  const palette = palettes[hash(item.title) % palettes.length];
  const { Icon } = palette;
  const vibes = item.vibes ?? [];
  const { rating, count } = seedRating(item.id);

  const groupId = (item as DiscoverItem & { groupId?: string }).groupId;
  const chatHref = groupId
    ? `/dashboard/messages?groupId=${encodeURIComponent(groupId)}`
    : "/dashboard/messages";
  const checkoutHref = groupId ? `/dashboard/groups/${groupId}/checkout` : href;

  const spotsLeft = item.groupSizeMax - item.joinedCount;
  const fillPct = Math.min(100, Math.round((item.joinedCount / item.groupSizeMax) * 100));
  const isFull = spotsLeft <= 0;
  const isAlmostFull = spotsLeft > 0 && spotsLeft <= 3;

  // Build stop pills from destination + vibes (simulate waypoints)
  const stops: string[] = item.destination
    ? [item.destination, ...(item.destinationState ? [item.destinationState] : []), ...vibes.slice(0, 2)]
    : vibes.slice(0, 3);

  function handleGroupChat(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(chatHref)}`);
      return;
    }
    router.push(chatHref);
  }

  function handleEnrollNow(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!session) {
      router.push(`/login?next=${encodeURIComponent(href)}`);
      return;
    }
    if (!isPlan && groupId) {
      startTransition(async () => {
        try {
          await apiFetchWithAuth<GroupMember>(`/groups/${groupId}/join`, { method: "POST" });
        } catch {
          // Already a member — that's fine
        }
        router.push(checkoutHref);
      });
    } else {
      router.push(href);
    }
  }

return (
  <div className="group/card flex h-full flex-col overflow-hidden rounded-sm border border-[var(--color-border)] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-sea-500)]/25 hover:shadow-[0_18px_48px_rgba(15,23,42,0.14)]">
    <Link href={href} className="relative block overflow-hidden" style={{ aspectRatio: "16/11" }}>
      {item.coverImageUrl ? (
        <img
          src={item.coverImageUrl}
          alt={item.title}
          className="size-full object-cover transition-transform duration-500 group-hover/card:scale-105"
          loading="lazy"
        />
      ) : (
        <div className={cn("size-full bg-gradient-to-br", palette.gradient)}>
          <Icon className="absolute bottom-4 right-4 size-14 text-white/15" />
        </div>
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
        <p className="truncate text-xs text-slate-500">{durLabel}</p>

        <div className="flex shrink-0 items-center gap-1">
          <Star className="size-3.5 fill-[var(--color-amber-500)] text-[var(--color-amber-500)]" />
          <span className="text-xs font-bold text-[var(--color-sea-700)]">{rating}</span>
          <span className="text-[10px] text-slate-400">({count})</span>
        </div>
      </div>

      <Link href={href}>
        <h3 className="line-clamp-2 min-h-[22px] text-[20px] font-bold leading-snug text-[var(--color-ink-950)] transition-colors hover:text-[var(--color-sea-700)] sm:text-lg">
          {item.title}
        </h3>
      </Link>

      <div className="mt-  px-2.5 py-1">
        <div className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0 text-[var(--color-sea-600)]" />
          <p className="truncate text-[11px] font-semibold text-[var(--color-ink-700)]">
            {stops.slice(0, 2).join(" • ")}
          </p>
        </div>
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
            <span className="text-xl font-extrabold text-[var(--color-ink-950)]">
              {budgetLabel}
            </span>
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
        <div
          className="h-full rounded-full bg-[var(--color-sea-500)] transition-all"
          style={{ width: `${fillPct}%` }}
        />
      </div>

      <div className="mt-4 grid grid-cols-[44px_1fr] gap-2.5">
        <button
          type="button"
          onClick={handleGroupChat}
          className="flex h-11 items-center justify-center rounded-sm border border-[var(--color-sea-500)]/35 bg-white text-[var(--color-sea-700)] transition hover:border-[var(--color-sea-500)] hover:bg-[var(--color-sea-50)] active:scale-[0.97]"
        >
          <MessageCircle className="size-4" />
        </button>

        <button
          type="button"
          disabled={showSendOfferCta ? false : isFull || isPending}
          onClick={handleEnrollNow}
          className={cn(
            "flex h-11 items-center justify-center rounded-sm text-sm font-extrabold transition active:scale-[0.98]",
            !showSendOfferCta && isFull
              ? "cursor-not-allowed bg-slate-100 text-slate-400"
              : "bg-[var(--color-amber-600)] text-white shadow-sm hover:bg-[var(--color-amber-600)]",
            isPending && "opacity-70"
          )}
        >
          {showSendOfferCta
            ? "Send Offer"
            : isPending
              ? "Joining..."
              : isFull
                ? "Full"
                : "Book Now"}
        </button>
      </div>
    </div>
  </div>
);
}

/** Compact card for "Trending Near You" */
export function DiscoverCardCompact({ item }: { item: DiscoverItem }) {
  const href = item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const isPlan = item.originType === "plan";
  const sourceBadge = isPlan
    ? { label: "Plan", classes: "bg-emerald-500 text-white" }
    : { label: "Package", classes: "bg-violet-500 text-white" };
  const palette = palettes[hash(item.title) % palettes.length];
  const { Icon } = palette;
  const dateLabel = formatDateRange(item.startDate, item.endDate);
  const budgetLabel = formatCurrency(item.priceLow ?? item.priceHigh ?? null);
  const { rating } = seedRating(item.id);

  return (
    <Link href={href} className="group/compact block">
      <div className={cn(
        "relative overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
      )}>
        {/* Image */}
        <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
          {item.coverImageUrl ? (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover/compact:scale-105"
              loading="lazy"
            />
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", palette.gradient)}>
              <Icon className="absolute right-3 top-3 size-10 text-white/15" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Rating */}
          <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-black/50 px-1.5 py-0.5 backdrop-blur-sm">
            <Star className="size-2.5 fill-emerald-400 text-emerald-400" />
            <span className="text-[9px] font-bold text-white">{rating}</span>
          </div>

          <span
            className={cn(
              "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
              sourceBadge.classes
            )}
          >
            {sourceBadge.label}
          </span>

          {/* Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            <p className="line-clamp-2 text-xs font-bold leading-tight text-white">{item.title}</p>
            <div className="mt-1 flex items-center justify-between gap-1">
              <p className="text-[10px] text-white/60 truncate">{dateLabel || item.destination}</p>
              <span className="shrink-0 text-[10px] font-bold text-emerald-300">{budgetLabel}</span>
            </div>
            <div className="mt-1.5 h-0.5 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-0.5 rounded-full bg-emerald-400"
                style={{ width: `${Math.min(100, Math.round((item.joinedCount / item.groupSizeMax) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
