import Link from "next/link";
import { CalendarDays, Compass, MapPin, Mountain, Palmtree, Sunrise, Users } from "lucide-react";
import { formatCurrency, formatDuration, formatDateRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DiscoverItem } from "@/lib/api/types";

const palettes = [
  { gradient: "from-[#0f766e] via-[#0d9488] to-[#2dd4bf]", Icon: Mountain },
  { gradient: "from-[#b45309] via-[#ea580c] to-[#fb923c]", Icon: Sunrise },
  { gradient: "from-[#0b3b66] via-[#155e8a] to-[#38bdf8]", Icon: Compass },
  { gradient: "from-[#3f6212] via-[#4d7c0f] to-[#84cc16]", Icon: Palmtree },
];

function hash(input: string) {
  return Array.from(input).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function DiscoverCard({ item }: { item: DiscoverItem }) {
  const href =
    item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const isPlan = item.originType === "plan";
  const dur = formatDuration(item.startDate, item.endDate);
  const durLabel = dur ? `${dur.days} Days` : "Flexible";
  const budgetLabel = formatCurrency(item.priceLow ?? item.priceHigh ?? null);
  const palette = palettes[hash(item.title) % palettes.length];
  const { Icon } = palette;
  const vibe = item.vibes?.[0] ?? "";

  return (
    <Link href={href} className="group block">
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/8 bg-[#081527]",
          "shadow-[0_14px_35px_rgba(0,0,0,0.22)] transition-all duration-300",
          "group-hover:-translate-y-1 group-hover:shadow-[0_20px_45px_rgba(0,0,0,0.3)]",
        )}
      >
        <div className="relative min-h-[21rem] sm:min-h-[24rem]">
          {item.coverImageUrl ? (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className={cn("absolute inset-0 bg-linear-to-br", palette.gradient)}>
              <Icon className="absolute right-5 top-5 size-16 text-white/15" />
              <div className="absolute -bottom-6 -left-6 size-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -right-4 top-1/3 size-24 rounded-full bg-white/10 blur-xl" />
            </div>
          )}

          <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/45 to-black/15" />

          <div className="absolute left-3 top-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                isPlan
                  ? "bg-emerald-500/95 text-white"
                  : "bg-sky-500/95 text-white",
              )}
            >
              {isPlan ? "User Plan" : "Agency Package"}
            </span>
          </div>
          {vibe ? (
            <div className="absolute right-3 top-3 rounded-full border border-white/25 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/90 backdrop-blur-sm">
              {vibe}
            </div>
          ) : null}

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-white/70">
              <MapPin className="size-3 shrink-0" />
              <span className="line-clamp-1">
                {item.destination}
                {item.destinationState ? `, ${item.destinationState}` : ""}
              </span>
            </div>

            <h3 className="mb-3 line-clamp-2 font-display text-[1.2rem] font-black leading-tight text-white sm:text-[1.35rem]">
              {item.title}
            </h3>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/12 bg-black/45 px-2.5 py-2 text-center backdrop-blur-sm">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/55">Budget</p>
                <p className="truncate text-[11px] font-bold text-white">{budgetLabel}</p>
              </div>
              <div className="rounded-xl border border-white/12 bg-black/45 px-2.5 py-2 text-center backdrop-blur-sm">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/55">Duration</p>
                <p className="truncate text-[11px] font-bold text-white">{durLabel}</p>
              </div>
              <div className="rounded-xl border border-white/12 bg-black/45 px-2.5 py-2 text-center backdrop-blur-sm">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/55">Members</p>
                <p className="text-[11px] font-bold text-white">
                  {item.joinedCount}/{item.groupSizeMax}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** Compact 2-column card used for "Trending Near You" */
export function DiscoverCardCompact({ item }: { item: DiscoverItem }) {
  const href =
    item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
  const palette = palettes[hash(item.title) % palettes.length];
  const { Icon } = palette;
  const dateLabel = formatDateRange(item.startDate, item.endDate);
  const isPlan = item.originType === "plan";

  return (
    <Link href={href} className="group block">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-white/10 bg-[#0b1d33]",
          "shadow-[0_10px_24px_rgba(0,0,0,0.2)] transition-all duration-300",
          "group-hover:-translate-y-0.5 group-hover:shadow-[0_14px_30px_rgba(0,0,0,0.28)]",
        )}
      >
        <div className="relative aspect-4/5">
          {item.coverImageUrl ? (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className={cn("absolute inset-0 bg-linear-to-br", palette.gradient)}>
              <Icon className="absolute right-3 top-3 size-10 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />

          <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/85 backdrop-blur-sm">
            {isPlan ? <Users className="size-2.5" /> : <CalendarDays className="size-2.5" />}
            {isPlan ? "Plan" : "Package"}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="line-clamp-2 font-display text-[0.85rem] font-bold leading-tight text-white">
              {item.title}
            </p>
            <p className="mt-1 text-[10px] text-white/70">{dateLabel}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
