import Link from "next/link";
import { MapPin } from "lucide-react";
import { Mountain, Palmtree, Sunrise, Compass } from "lucide-react";
import { formatCurrency, formatDuration, formatDateRange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DiscoverItem } from "@/lib/api/types";

const palettes = [
  { gradient: "from-[#0d9670] via-[#14b88a] to-[#5edbb5]", Icon: Mountain },
  { gradient: "from-[#e04f1a] via-[#f06830] to-[#ffa574]", Icon: Sunrise },
  { gradient: "from-[#2a5f8f] via-[#3a7cb5] to-[#7db8e0]", Icon: Compass },
  { gradient: "from-[#5a7c2f] via-[#7da33f] to-[#b5d47a]", Icon: Palmtree },
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
  const palette = palettes[hash(item.title) % palettes.length];
  const { Icon } = palette;

  return (
    <Link href={href} className="group block">
      <div
        className={cn(
          "relative overflow-hidden rounded-xl",
          "shadow-(--shadow-md) transition-all duration-300",
          "group-hover:shadow-(--shadow-xl) group-hover:-translate-y-1",
        )}
      >
        {/* Background: cover image or gradient fallback */}
        <div className="relative min-h-65 sm:min-h-75">
          {item.coverImageUrl ? (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className={cn("absolute inset-0 bg-linear-to-br", palette.gradient)}>
              <Icon className="absolute right-5 top-5 size-16 text-white/15" />
              <div className="absolute -bottom-6 -left-6 size-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -right-4 top-1/3 size-24 rounded-full bg-white/10 blur-xl" />
            </div>
          )}

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/35 to-black/10" />

          {/* Badge — top-left */}
          <div className="absolute left-3 top-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1",
                "text-[10px] font-bold uppercase tracking-[0.15em] shadow-(--shadow-sm)",
                isPlan
                  ? "bg-(--color-sea-600) text-white"
                  : "bg-[#6d4fc7] text-white",
              )}
            >
              {isPlan ? (
                <svg className="size-2.5" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M6 0L7.47 4.53L12 6L7.47 7.47L6 12L4.53 7.47L0 6L4.53 4.53L6 0Z" />
                </svg>
              ) : (
                <svg className="size-2.5" viewBox="0 0 12 12" fill="currentColor">
                  <rect x="1" y="3" width="10" height="7" rx="1" />
                  <path d="M4 3V2a2 2 0 014 0v1" />
                </svg>
              )}
              {isPlan ? "Verified Host" : "Safety Bonded"}
            </span>
          </div>

          {/* Content overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Location */}
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-white/65">
              <MapPin className="size-3 shrink-0" />
              <span className="line-clamp-1">
                {item.destination}
                {item.destinationState ? `, ${item.destinationState}` : ""}
              </span>
            </div>

            {/* Title */}
            <h3 className="mb-3 font-display text-[1.25rem] font-bold leading-tight text-white line-clamp-2 sm:text-[1.35rem]">
              {item.title}
            </h3>

            {/* Stats bar */}
            <div className="grid grid-cols-3 divide-x divide-white/20 overflow-hidden rounded-md bg-black/45 backdrop-blur-sm">
              <div className="px-3 py-2.5 text-center">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/50">
                  Budget
                </p>
                <p className="truncate text-[11px] font-bold text-white">
                  {formatCurrency(item.priceLow)}
                </p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/50">
                  Duration
                </p>
                <p className="text-[11px] font-bold text-white">{durLabel}</p>
              </div>
              <div className="px-3 py-2.5 text-center">
                <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-white/50">
                  Members
                </p>
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

  return (
    <Link href={href} className="group block">
      <div
        className={cn(
          "relative overflow-hidden rounded-lg",
          "shadow-(--shadow-sm) transition-all duration-300",
          "group-hover:shadow-(--shadow-md) group-hover:-translate-y-0.5",
        )}
      >
        <div className="relative aspect-4/5">
          {item.coverImageUrl ? (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className={cn("absolute inset-0 bg-linear-to-br", palette.gradient)}>
              <Icon className="absolute right-3 top-3 size-10 text-white/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

          {/* Label */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <p className="line-clamp-2 font-display text-[0.8rem] font-bold leading-tight text-white">
              {item.title}
            </p>
            <p className="mt-1 text-[10px] text-white/60">{dateLabel}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
