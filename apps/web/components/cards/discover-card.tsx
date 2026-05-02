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
  { gradient: "from-teal-900 via-teal-700 to-emerald-500", accentGradient: "from-teal-500 to-emerald-400", Icon: Mountain, color: "teal" },
  { gradient: "from-orange-900 via-amber-700 to-orange-500", accentGradient: "from-amber-500 to-orange-400", Icon: Sunrise, color: "orange" },
  { gradient: "from-blue-900 via-sky-700 to-cyan-500", accentGradient: "from-sky-500 to-cyan-400", Icon: Waves, color: "blue" },
  { gradient: "from-green-900 via-emerald-700 to-lime-500", accentGradient: "from-emerald-500 to-lime-400", Icon: TreePine, color: "green" },
  { gradient: "from-violet-900 via-purple-700 to-pink-500", accentGradient: "from-violet-500 to-pink-400", Icon: Compass, color: "violet" },
  { gradient: "from-red-900 via-rose-700 to-orange-500", accentGradient: "from-rose-500 to-orange-400", Icon: Flame, color: "red" },
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

function StarRow({ rating }: { rating: string }) {
  const r = parseFloat(rating);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "size-3",
            i <= Math.floor(r)
              ? "fill-amber-400 text-amber-400"
              : i - 0.5 <= r
              ? "fill-amber-300 text-amber-400"
              : "text-white/25"
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
    // For packages: join group then go to checkout
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
    <div className="group/card relative flex h-full flex-col">
      {/* Glow effect on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 bg-gradient-to-br from-emerald-400/20 to-transparent blur-xl" />

      <div className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl",
        "border border-white/10 bg-white",
        "shadow-[0_4px_24px_rgba(0,0,0,0.08)]",
        "transition-all duration-500",
        "group-hover/card:-translate-y-2 group-hover/card:shadow-[0_20px_60px_rgba(0,0,0,0.15)]",
      )}>

        {/* ── Hero ── */}
        <div className="relative overflow-hidden" style={{ height: "240px" }}>
          {item.coverImageUrl ? (
            <>
              <img
                src={item.coverImageUrl}
                alt={item.title}
                className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover/card:scale-110"
                loading="lazy"
              />
              {/* Cinematic overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
            </>
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", palette.gradient)}>
              <div className="absolute inset-0 opacity-20 [background:radial-gradient(ellipse_at_top_right,white_0%,transparent_60%)]" />
              <Icon className="absolute bottom-6 right-6 size-24 text-white/10" />
            </div>
          )}

          {/* Top badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 z-10">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
              "backdrop-blur-md border border-white/20",
              isPlan
                ? "bg-emerald-500/80 text-white"
                : "bg-blue-500/80 text-white"
            )}>
              {isPlan ? <Users className="size-2.5" /> : <Building2 className="size-2.5" />}
              {isPlan ? "User Plan" : "Agency Package"}
            </span>

            {isAlmostFull && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/80 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md">
                <Zap className="size-2.5" />
                Only {spotsLeft} left!
              </span>
            )}
          </div>

          {/* Rating top-right */}
          <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-2.5 py-1.5 backdrop-blur-md">
            <Star className="size-3 fill-amber-400 text-amber-400" />
            <span className="text-[11px] font-bold text-white">{rating}</span>
            <span className="text-[9px] text-white/60">({count})</span>
          </div>

          {/* Bottom: Location + Title */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
            <div className="mb-1.5 flex items-center gap-1.5">
              <MapPin className="size-3 shrink-0 text-white/70" />
              <span className="text-[11px] font-semibold text-white/80 truncate">
                {item.destination}{item.destinationState ? `, ${item.destinationState}` : ""}
              </span>
            </div>
            <h3 className="font-display text-xl font-black leading-tight text-white drop-shadow-md line-clamp-2">
              {item.title}
            </h3>

            {/* Vibe tags */}
            {vibes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {vibes.slice(0, 2).map((v) => (
                  <span
                    key={v}
                    className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-semibold text-white/90 backdrop-blur-sm"
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}

            {/* Spots fill bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-white/50">Spots filled</span>
                <span className={cn("text-[9px] font-bold", isFull ? "text-red-400" : isAlmostFull ? "text-amber-300" : "text-white/70")}>
                  {item.joinedCount} / {item.groupSizeMax}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className={cn(
                    "h-1 rounded-full transition-all",
                    isFull ? "bg-red-400" : isAlmostFull ? "bg-amber-400" : "bg-emerald-400"
                  )}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Card Body ── */}
        <div className="flex flex-1 flex-col bg-white p-4">

          {/* Stars + date row */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StarRow rating={rating} />
              <span className="text-[11px] font-semibold text-slate-600">{rating} <span className="text-slate-400 font-normal">({count})</span></span>
            </div>
            {(item.startDate || item.endDate) && (
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                <CalendarDays className="size-3 shrink-0" />
                <span className="truncate max-w-[120px]">{formatDateRange(item.startDate, item.endDate)}</span>
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            {[
              { label: "Duration", value: durLabel, icon: Clock },
              { label: "Price", value: budgetLabel, icon: null, highlight: true },
              { label: "Group", value: `${item.joinedCount}/${item.groupSizeMax}`, icon: Users },
            ].map(({ label, value, icon: IconComp, highlight }) => (
              <div
                key={label}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl py-2.5 px-1 text-center",
                  highlight
                    ? "bg-emerald-50 border border-emerald-100"
                    : "bg-slate-50 border border-slate-100"
                )}
              >
                {IconComp && <IconComp className="mb-0.5 size-3 text-slate-400" />}
                <p className="text-[8.5px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
                <p className={cn("mt-0.5 text-[11px] font-bold", highlight ? "text-emerald-700" : "text-slate-800")}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* ── CTA Buttons ── */}
          <div className="space-y-2">
            {/* Primary row: Group Chat + Enroll Now */}
            <div className="grid grid-cols-2 gap-2">
              {/* Group Chat */}
              <button
                type="button"
                onClick={handleGroupChat}
                className={cn(
                  "group/btn relative flex items-center justify-center gap-2 overflow-hidden rounded-xl border px-3 py-2.5",
                  "border-slate-200 bg-white text-slate-700 text-xs font-semibold",
                  "transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
                  "active:scale-[0.97] shadow-sm",
                )}
              >
                <MessageCircle className="size-3.5 shrink-0" />
                <span>Group Chat</span>
              </button>

              {/* Enroll Now */}
              <button
                type="button"
                disabled={isFull || isPending}
                onClick={handleEnrollNow}
                className={cn(
                  "relative flex items-center justify-center gap-2 overflow-hidden rounded-xl px-3 py-2.5 text-xs font-bold",
                  "transition-all duration-200 active:scale-[0.97]",
                  isFull
                    ? "cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:from-emerald-400 hover:to-emerald-500 hover:shadow-[0_6px_24px_rgba(16,185,129,0.5)]",
                  isPending && "opacity-70",
                )}
              >
                {!isFull && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                )}
                <CreditCard className="size-3.5 shrink-0" />
                <span>{isPending ? "Joining..." : isFull ? "Group Full" : "Enroll Now"}</span>
              </button>
            </div>

            {/* View details */}
            <Link href={href} className="block">
              <div className={cn(
                "flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold",
                "border-slate-200 bg-slate-50 text-slate-600",
                "transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800",
                "active:scale-[0.98]",
              )}>
                <span>{isPlan ? "View Plan Details" : "View Package Details"}</span>
                <ArrowRight className="size-3.5" />
              </div>
            </Link>
          </div>
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
        "relative overflow-hidden rounded-2xl",
        "border border-white/10",
        "shadow-[0_2px_12px_rgba(0,0,0,0.1)] transition-all duration-300",
        "group-hover/compact:-translate-y-1 group-hover/compact:shadow-[0_12px_32px_rgba(0,0,0,0.18)]",
      )}>
        <div className="relative" style={{ paddingBottom: "130%" }}>
          {item.coverImageUrl ? (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="absolute inset-0 size-full object-cover transition-transform duration-600 group-hover/compact:scale-110"
              loading="lazy"
            />
          ) : (
            <div className={cn("absolute inset-0 bg-gradient-to-br", palette.gradient)}>
              <Icon className="absolute right-3 top-3 size-10 text-white/15" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

          {/* Type tag */}
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2 py-0.5 backdrop-blur-sm">
            {isPlan ? <Users className="size-2.5 text-white" /> : <CalendarDays className="size-2.5 text-white" />}
            <span className="text-[9px] font-semibold text-white">{isPlan ? "Plan" : "Pkg"}</span>
          </div>

          {/* Rating */}
          <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full border border-white/20 bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
            <Star className="size-2.5 fill-amber-400 text-amber-400" />
            <span className="text-[9px] font-bold text-white">{rating}</span>
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="line-clamp-2 font-display text-sm font-bold leading-tight text-white">
              {item.title}
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <p className="text-[10px] text-white/60 truncate">{dateLabel || item.destination}</p>
              <span className="shrink-0 text-[10px] font-bold text-emerald-300">{budgetLabel}</span>
            </div>
            {/* Mini fill indicator */}
            <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-white/15">
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
