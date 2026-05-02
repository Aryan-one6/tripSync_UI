"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Compass,
  MapPin,
  Mountain,
  Palmtree,
  Sunrise,
  Users,
  Star,
  Clock,
  MessageCircle,
  CreditCard,
  ArrowRight,
  Waves,
  TreePine,
  Flame,
  Building2,
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
  { gradient: "from-orange-900 via-amber-700 to-orange-500", Icon: Sunrise },
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

/* Dot pagination indicators — like Thrillophilia */
function DotIndicator({ count, active }: { count: number; active: number }) {
  if (count <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full transition-all",
            i === active ? "bg-white w-3" : "bg-white/50"
          )}
        />
      ))}
    </div>
  );
}

export function DiscoverCard({ item }: { item: DiscoverItem }) {
  const { session, apiFetchWithAuth } = useAuth();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const href = item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const isPlan = item.originType === "plan";
  const dur = formatDuration(item.startDate, item.endDate);
  const durLabel = dur ? `${dur.days}D / ${dur.nights}N` : "Flexible";
  const nightLabel = dur ? `${dur.days} days & ${dur.nights} nights` : null;
  const budgetLabel = formatCurrency(item.priceLow ?? item.priceHigh ?? null);
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
    <div className="group/card flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

      {/* ── Hero image ── */}
      <Link href={href} className="relative block overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {item.coverImageUrl ? (
          <img
            src={item.coverImageUrl}
            alt={item.title}
            className="size-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={cn("size-full bg-gradient-to-br", palette.gradient)}>
            <Icon className="absolute bottom-4 right-4 size-16 text-white/10" />
          </div>
        )}

        {/* Gradient overlay — stronger at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Top-left: Type badge */}
        <div className="absolute left-2.5 top-2.5 z-10">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white backdrop-blur-sm",
            isPlan ? "bg-emerald-500/90" : "bg-blue-600/90"
          )}>
            {isPlan ? <Users className="size-2.5" /> : <Building2 className="size-2.5" />}
            {isPlan ? "User Plan" : "Agency Package"}
          </span>
        </div>

        {/* Top-right: Rating */}
        <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm">
          <Star className="size-3 fill-amber-400 text-amber-400" />
          <span className="text-[11px] font-bold text-white">{rating}</span>
          <span className="text-[9px] text-white/60">({count})</span>
        </div>

        {/* Almost-full urgency badge */}
        {isAlmostFull && (
          <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 backdrop-blur-sm">
            <Zap className="size-2.5 text-white" />
            <span className="text-[9px] font-bold text-white">Only {spotsLeft} left!</span>
          </div>
        )}

        {/* Spots fill bar — at very bottom of image */}
        <div className="absolute bottom-0 inset-x-0 z-10">
          <div className="flex items-center justify-between px-2.5 pb-1.5 pt-0">
            <span className="text-[8px] font-semibold uppercase tracking-widest text-white/60">Spots filled</span>
            <span className="text-[8px] font-bold text-white/70">{item.joinedCount}/{item.groupSizeMax}</span>
          </div>
          <div className="h-0.5 w-full bg-white/20">
            <div
              className={cn("h-0.5 transition-all", isFull ? "bg-red-400" : isAlmostFull ? "bg-amber-400" : "bg-emerald-400")}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          <DotIndicator count={3} active={0} />
        </div>
      </Link>

      {/* ── Card body — Thrillophilia style ── */}
      <div className="flex flex-1 flex-col p-3.5">

        {/* Duration + date row */}
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {nightLabel ?? durLabel}
          </span>
          <div className="flex items-center gap-1">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold text-slate-700">{rating}</span>
            <span className="text-[10px] text-slate-400">({count})</span>
          </div>
        </div>

        {/* Title */}
        <Link href={href}>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 hover:text-emerald-700 transition-colors">
            {item.title}
          </h3>
        </Link>

        {/* Location + date sub-row */}
        <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="size-3 shrink-0 text-slate-400" />
            {item.destination}{item.destinationState ? `, ${item.destinationState}` : ""}
          </span>
          {(item.startDate || item.endDate) && (
            <span className="flex shrink-0 items-center gap-1">
              <CalendarDays className="size-3 text-slate-400" />
              {formatDateRange(item.startDate, item.endDate)}
            </span>
          )}
        </div>

        {/* Vibe tags */}
        {vibes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {vibes.slice(0, 3).map((v) => (
              <span key={v} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                {v}
              </span>
            ))}
          </div>
        )}

        {/* Price row */}
        <div className="mt-2.5 flex items-baseline gap-1.5">
          <span className="text-base font-black text-slate-900">{budgetLabel}</span>
          <span className="text-[11px] text-slate-400">/Adult</span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
            <Users className="size-3" />
            {item.joinedCount}/{item.groupSizeMax}
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── CTAs — all logic preserved ── */}
        <div className="mt-3 space-y-2">
          {/* Group Chat + Enroll Now */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleGroupChat}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.97]"
            >
              <MessageCircle className="size-3.5 shrink-0" />
              Group Chat
            </button>

            <button
              type="button"
              disabled={isFull || isPending}
              onClick={handleEnrollNow}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition active:scale-[0.97]",
                isFull
                  ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
                  : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500",
                isPending && "opacity-70"
              )}
            >
              <CreditCard className="size-3.5 shrink-0" />
              {isPending ? "Joining..." : isFull ? "Full" : "Enroll Now"}
            </button>
          </div>

          {/* View details */}
          <Link href={href} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-800 active:scale-[0.98]">
            {isPlan ? "View Plan Details" : "View Package Details"}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Compact card for "Trending Near You" */
export function DiscoverCardCompact({ item }: { item: DiscoverItem }) {
  const href = item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const palette = palettes[hash(item.title) % palettes.length];
  const { Icon } = palette;
  const dateLabel = formatDateRange(item.startDate, item.endDate);
  const isPlan = item.originType === "plan";
  const budgetLabel = formatCurrency(item.priceLow ?? item.priceHigh ?? null);
  const { rating } = seedRating(item.id);

  return (
    <Link href={href} className="group/compact block">
      <div className={cn(
        "relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
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
            <Star className="size-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[9px] font-bold text-white">{rating}</span>
          </div>

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
