import Link from "next/link";
import { Compass, TrendingUp, Users } from "lucide-react";
import { DiscoverCard, DiscoverCardCompact } from "@/components/cards/discover-card";
import { FollowingDiscoverResults } from "@/components/discover/following-discover-results";
import { DiscoverSearchFilters } from "@/components/discover/discover-search-filters";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDiscoverItems, getTrendingItems, searchDiscover } from "@/lib/api/public";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const QUICK_FILTERS = [
  { id: "all", label: "All", originType: undefined, vibes: undefined },
  { id: "adventure", label: "Adventure", originType: undefined, vibes: "Adventure" },
  { id: "beach", label: "Beach", originType: undefined, vibes: "Beach" },
  { id: "mountains", label: "Mountains", originType: undefined, vibes: "Mountains" },
  { id: "culture", label: "Culture", originType: undefined, vibes: "Culture" },
  { id: "packages", label: "Packages", originType: "package" as const, vibes: undefined },
] as const;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const destination = typeof params.destination === "string" ? params.destination : "";
  const vibes = typeof params.vibes === "string" ? params.vibes : "";
  const originType =
    params.originType === "plan" || params.originType === "package"
      ? params.originType
      : undefined;
  const sort =
    params.sort === "price_low" ||
    params.sort === "price_high" ||
    params.sort === "popular" ||
    params.sort === "recent"
      ? params.sort
      : "recent";
  const q = typeof params.q === "string" ? params.q : "";
  const audience = params.audience === "agency" ? "agency" : "traveler";
  const rail =
    params.rail === "following" || params.rail === "trending" || params.rail === "for-you"
      ? params.rail
      : "for-you";

  const [forYouItems, trending] = await Promise.all([
    q ? searchDiscover(q) : getDiscoverItems({ audience, destination, vibes, originType, sort }),
    getTrendingItems(),
  ]);

  const items = rail === "trending" ? trending : forYouItems;

  const majorFilters = [
    {
      id: "for-you",
      label: "For You",
      description: "Balanced results across the marketplace.",
      icon: Compass,
    },
    {
      id: "following",
      label: "Following",
      description: "Only listings from travelers and agencies you follow.",
      icon: Users,
    },
    {
      id: "trending",
      label: "Trending",
      description: "Listings picking up the most momentum right now.",
      icon: TrendingUp,
    },
  ] as const;

  function buildDiscoverHref(overrides: Record<string, string | undefined>) {
    const nextParams = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q: q || undefined,
      audience,
      destination: destination || undefined,
      vibes: vibes || undefined,
      originType,
      sort,
      rail,
      ...overrides,
    })) {
      if (value) nextParams.set(key, value);
    }
    const qs = nextParams.toString();
    return qs ? `/discover?${qs}` : `/discover?audience=${audience}`;
  }

  function buildQuickFilterHref(filter: (typeof QUICK_FILTERS)[number]) {
    return buildDiscoverHref({
      vibes: filter.vibes ?? undefined,
      originType: filter.originType ?? undefined,
    });
  }

  function isQuickFilterActive(filter: (typeof QUICK_FILTERS)[number]) {
    if (filter.id === "all") return !vibes && !originType;
    if (filter.vibes) return vibes === filter.vibes;
    if (filter.originType) return originType === filter.originType;
    return false;
  }

  return (
    <div className="page-shell pb-mobile-nav">

      {/* ── Hero Header ── */}
      <section className="relative mb-6 mt-3 overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-sea-700)] via-[var(--color-sea-600)] to-[var(--color-sea-500)] p-5 text-white shadow-[var(--shadow-lg)] sm:mb-8 sm:mt-4 sm:rounded-[var(--radius-2xl)] sm:p-8 lg:p-10">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-white/10 blur-2xl sm:-right-12 sm:-top-12 sm:size-48" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 size-24 rounded-full bg-white/5 blur-xl sm:size-32" />

        <div className="relative">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.24em] text-white/70 sm:text-[10px] sm:tracking-[0.26em]">
            TravellersIn
          </p>
          <h1 className="font-display text-[2rem] font-black leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl">
            Discover
            <br />
            <em className="not-italic text-[var(--color-sea-200)]">Adventure</em>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:mt-4 sm:text-base">
            Browse live community plans and agency packages. Filter by destination, budget, dates, or vibe.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5 sm:mt-6 sm:gap-3">
            {["Escrow protected", "Verified agencies", "Live group chat"].map((pill) => (
              <span
                key={pill}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-sm"
              >
                ✓ {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Search bar ── */}
      <DiscoverSearchFilters
        q={q}
        destination={destination}
        vibes={vibes}
        originType={originType}
        sort={sort}
        audience={audience}
        rail={rail}
      />

      {/* ── Quick filter pills ── */}
      <div className="mb-8 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {QUICK_FILTERS.map((filter) => {
          const active = isQuickFilterActive(filter);
          return (
            <Link key={filter.id} href={buildQuickFilterHref(filter)} className="shrink-0">
              <span
                className={
                  active
                    ? "inline-flex items-center rounded-(--radius-full) px-4 py-2 text-sm font-semibold text-white shadow-(--shadow-sm) transition-all bg-(--color-sea-700)"
                    : "inline-flex items-center rounded-(--radius-full) border border-(--color-border-strong) bg-(--color-surface-raised) px-4 py-2 text-sm font-medium text-(--color-ink-700) shadow-(--shadow-sm) transition-all hover:border-(--color-sea-200) hover:bg-(--color-sea-50) hover:text-(--color-sea-700)"
                }
              >
                {filter.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ── Main layout: content + desktop sidebar ── */}
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">

        {/* ── Left: Popular Plans + Trending Near You ── */}
        <div className="space-y-12">

          {/* Popular Plans */}
          <section>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-(--color-ink-950) sm:text-2xl">
                Popular Plans
              </h2>
              <Link
                href={buildDiscoverHref({ rail: "for-you", q: undefined })}
                className="text-[11px] font-bold uppercase tracking-[0.18em] text-(--color-sea-600) transition hover:text-(--color-sea-500)"
              >
                See All
              </Link>
            </div>

            {rail === "following" ? (
              <FollowingDiscoverResults
                query={{
                  q: q || undefined,
                  audience,
                  destination: destination || undefined,
                  vibes: vibes || undefined,
                  originType,
                  sort,
                }}
              />
            ) : items.length === 0 ? (
              <EmptyState
                title="No results found"
                description="Try a broader destination or switch between plans and packages."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((item) => (
                  <DiscoverCard key={`${item.originType}-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </section>

          {/* Trending Near You */}
          {trending.length > 0 && (
            <section>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-(--color-ink-950) sm:text-2xl">
                  Trending Near You
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {trending.slice(0, 4).map((item) => (
                  <DiscoverCardCompact key={`${item.originType}-${item.id}`} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Feed filters — mobile only (desktop uses sidebar) */}
          <section className="xl:hidden">
            <Card className="h-fit p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-sm bg-(--color-sea-50) text-(--color-sea-700) shadow-(--shadow-sm)">
                  <Compass className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500)">
                    Major filters
                  </p>
                  <p className="font-display text-base text-(--color-ink-950)">Shape the feed</p>
                </div>
              </div>
              <div className="space-y-2">
                {majorFilters.map((filter) => {
                  const Icon = filter.icon;
                  const isActive = rail === filter.id;
                  return (
                    <Link
                      key={filter.id}
                      href={buildDiscoverHref({ rail: filter.id })}
                      className={`flex items-center gap-3 rounded-md border p-3 transition ${
                        isActive
                          ? "border-(--color-sea-200) bg-(--color-sea-50)"
                          : "border-(--color-border) bg-(--color-surface-raised) hover:border-(--color-sea-100)"
                      }`}
                    >
                      <div className="flex size-8 items-center justify-center rounded-full bg-white text-(--color-sea-700) shadow-(--shadow-sm)">
                        <Icon className="size-4" />
                      </div>
                      <span className="text-sm font-semibold text-(--color-ink-950)">{filter.label}</span>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </section>
        </div>

        {/* ── Desktop sidebar ── */}
        <div className="hidden xl:block xl:sticky xl:top-24 self-start xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto hide-scrollbar space-y-5">
          {/* Feed type selector */}
          <Card className="h-fit p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-sm bg-(--color-sea-50) text-(--color-sea-700) shadow-(--shadow-sm)">
                <Compass className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-(--color-ink-500)">
                  Major filters
                </p>
                <p className="font-display text-lg text-(--color-ink-950)">Shape the feed first</p>
              </div>
            </div>
            <div className="space-y-3">
              {majorFilters.map((filter) => {
                const Icon = filter.icon;
                const isActive = rail === filter.id;
                return (
                  <Link
                    key={filter.id}
                    href={buildDiscoverHref({ rail: filter.id })}
                    className={`block rounded-lg border p-4 transition ${
                      isActive
                        ? "border-(--color-sea-200) bg-(--color-sea-50) shadow-(--shadow-md)"
                        : "border-(--color-border) bg-(--color-surface-raised) hover:border-(--color-sea-100) hover:shadow-(--shadow-sm)"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-white text-(--color-sea-700) shadow-(--shadow-sm)">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-(--color-ink-950)">{filter.label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-(--color-ink-600)">
                          {filter.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* Trending sidebar */}
      
        </div>
      </div>
    </div>
  );
}
