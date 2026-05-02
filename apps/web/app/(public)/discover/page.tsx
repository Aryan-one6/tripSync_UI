import Link from "next/link";
import { Compass, TrendingUp, Users, Building2 } from "lucide-react";
import { DiscoverCard, DiscoverCardCompact } from "@/components/cards/discover-card";
import { FollowingDiscoverResults } from "@/components/discover/following-discover-results";
import { DiscoverSearchFilters } from "@/components/discover/discover-search-filters";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDiscoverItems, getTrendingItems, searchDiscover } from "@/lib/api/public";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Quick filters shown to ALL audiences
const QUICK_FILTERS_BASE = [
  { id: "all", label: "All", originType: undefined, vibes: undefined, planType: undefined },
  { id: "adventure", label: "Adventure", originType: undefined, vibes: "Adventure", planType: undefined },
  { id: "beach", label: "Beach", originType: undefined, vibes: "Beach", planType: undefined },
  { id: "mountains", label: "Mountains", originType: undefined, vibes: "Mountains", planType: undefined },
  { id: "culture", label: "Culture", originType: undefined, vibes: "Culture", planType: undefined },
  { id: "packages", label: "Packages", originType: "package" as const, vibes: undefined, planType: undefined },
] as const;

// Extra filter chips only shown to agency audience
const AGENCY_QUICK_FILTERS = [
  {
    id: "user-plans",
    label: "User Plans",
    originType: "plan" as const,
    vibes: undefined,
    planType: "STANDARD" as const,
    icon: Users,
    description: "Open traveler plans looking for agency quotes",
  },
  {
    id: "corporate-plans",
    label: "Corporate Plans",
    originType: "plan" as const,
    vibes: undefined,
    planType: "CORPORATE" as const,
    icon: Building2,
    description: "Corporate travel requests for business groups",
  },
] as const;

type QuickFilter = (typeof QUICK_FILTERS_BASE)[number];
type AgencyFilter = (typeof AGENCY_QUICK_FILTERS)[number];
type AnyFilter = QuickFilter | AgencyFilter;

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
  const planType =
    params.planType === "STANDARD" || params.planType === "CORPORATE"
      ? (params.planType as "STANDARD" | "CORPORATE")
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

  const isAgency = audience === "agency";

  const [forYouItems, trending] = await Promise.all([
    q
      ? searchDiscover(q)
      : getDiscoverItems({ audience, destination, vibes, originType, planType, sort }),
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

  const railContent = {
    "for-you": {
      overline: isAgency && planType === "CORPORATE" ? "Corporate feed" : "Personalized feed",
      title:
        isAgency && planType === "CORPORATE"
          ? "Corporate Plans"
          : isAgency && planType === "STANDARD"
          ? "User Plans"
          : "Popular Plans",
      description:
        isAgency && planType === "CORPORATE"
          ? "Corporate trip requests open for agency proposals."
          : isAgency && planType === "STANDARD"
          ? "Open traveler plans seeking agency packages and quotes."
          : "Balanced results from travelers and agencies across the platform.",
    },
    following: {
      overline: "Your network",
      title: "Following Feed",
      description: "Fresh listings from creators and agencies you already follow.",
    },
    trending: {
      overline: "Momentum picks",
      title: "Trending Listings",
      description: "Plans and packages getting the most traction right now.",
    },
  } as const;

  function buildDiscoverHref(overrides: Record<string, string | undefined>) {
    const nextParams = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q: q || undefined,
      audience,
      destination: destination || undefined,
      vibes: vibes || undefined,
      originType,
      planType,
      sort,
      rail,
      ...overrides,
    })) {
      if (value) nextParams.set(key, value);
    }
    const qs = nextParams.toString();
    return qs ? `/discover?${qs}` : `/discover?audience=${audience}`;
  }

  function buildQuickFilterHref(filter: AnyFilter) {
    return buildDiscoverHref({
      vibes: filter.vibes ?? undefined,
      originType: filter.originType ?? undefined,
      planType: ("planType" in filter ? filter.planType : undefined) ?? undefined,
    });
  }

  function isQuickFilterActive(filter: AnyFilter) {
    if (filter.id === "all") return !vibes && !originType && !planType;
    if ("planType" in filter && filter.planType) {
      return planType === filter.planType && originType === filter.originType;
    }
    if (filter.vibes) return vibes === filter.vibes;
    if (filter.originType) return originType === filter.originType && !planType;
    return false;
  }

  const quickFilters = [...QUICK_FILTERS_BASE];

  return (
    <div className="page-shell pb-mobile-nav">
      <section className="mb-5 mt-3 rounded-[var(--radius-xl)] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 shadow-[var(--shadow-sm)] sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">Live Trip Marketplace</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-[clamp(1.6rem,3.8vw,2.35rem)] font-black leading-[1.05] text-[var(--color-ink-950)]">
              Discover Better Trips.
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-[var(--color-ink-600)]">
              Compare live plans and packages by destination, budget, and vibe.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">
              {items.length.toLocaleString("en-IN")} live results
            </span>
            <span className="rounded-full border border-cyan-200 bg-cyan-100 px-3 py-1 font-semibold text-cyan-800">
              {trending.length.toLocaleString("en-IN")} trending
            </span>
          </div>
        </div>
      </section>

      <DiscoverSearchFilters
        q={q}
        destination={destination}
        vibes={vibes}
        originType={originType}
        planType={planType}
        sort={sort}
        audience={audience}
        rail={rail}
      />

      {/* Agency-only: Corporate / User Plans filter cards */}
      {isAgency && (
        <div className="mb-5 grid grid-cols-2 gap-3">
          {AGENCY_QUICK_FILTERS.map((filter) => {
            const Icon = filter.icon;
            const active = isQuickFilterActive(filter);
            return (
              <Link key={filter.id} href={buildQuickFilterHref(filter)} className="block">
                <div
                  className={`flex items-start gap-3 rounded-xl border p-3.5 transition ${
                    active
                      ? filter.id === "corporate-plans"
                        ? "border-violet-300 bg-violet-50 shadow-[0_4px_14px_rgba(139,92,246,0.15)]"
                        : "border-emerald-300 bg-emerald-50 shadow-[0_4px_14px_rgba(16,185,129,0.15)]"
                      : "border-[var(--color-border)] bg-white hover:border-emerald-200 hover:bg-emerald-50/50"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      active
                        ? filter.id === "corporate-plans"
                          ? "bg-violet-500 text-white"
                          : "bg-emerald-500 text-white"
                        : "bg-[var(--color-surface-2)] text-[var(--color-ink-600)]"
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        active
                          ? filter.id === "corporate-plans"
                            ? "text-violet-800"
                            : "text-emerald-800"
                          : "text-[var(--color-ink-900)]"
                      }`}
                    >
                      {filter.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-ink-500)]">
                      {filter.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mb-8 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {quickFilters.map((filter) => {
          const active = isQuickFilterActive(filter);
          return (
            <Link key={filter.id} href={buildQuickFilterHref(filter)} className="shrink-0">
              <span
                className={
                  active
                    ? "inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.3)]"
                    : "inline-flex items-center rounded-full border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                }
              >
                {filter.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section className="  p-4 sm:p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">
                  {railContent[rail].overline}
                </p>
                <h2 className="mt-1 font-display text-2xl font-black text-[var(--color-ink-950)] sm:text-3xl">
                  {railContent[rail].title}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">{railContent[rail].description}</p>
              </div>
              <Link
                href={buildDiscoverHref({ rail: "for-you", q: undefined })}
                className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600 transition hover:text-emerald-500"
              >
                See all
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
                title={
                  isAgency && planType === "CORPORATE"
                    ? "No corporate plans yet"
                    : "No results found"
                }
                description={
                  isAgency && planType === "CORPORATE"
                    ? "No corporate trip requests are currently open. Check back soon."
                    : "Try broader filters or switch between plans and packages."
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <DiscoverCard key={`${item.originType}-${item.id}`} item={item} />
                ))}
              </div>
            )}
          </section>

          {trending.length > 0 && (
            <section className="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-sm)] sm:p-6">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600">Hot right now</p>
                  <h2 className="mt-1 font-display text-xl font-black text-[var(--color-ink-950)] sm:text-2xl">
                    Trending Near You
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {trending.slice(0, 4).map((item) => (
                  <DiscoverCardCompact key={`${item.originType}-${item.id}`} item={item} />
                ))}
              </div>
            </section>
          )}

          <section className="xl:hidden">
            <Card className="h-fit border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-[var(--shadow-sm)]">
                  <Compass className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                    Feed mode
                  </p>
                  <p className="font-display text-base text-[var(--color-ink-950)]">Choose your lane</p>
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
                      className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                        isActive
                          ? "border-emerald-300 bg-emerald-100/70"
                          : "border-[var(--color-border)] bg-white hover:border-emerald-200"
                      }`}
                    >
                      <div className="flex size-8 items-center justify-center rounded-full bg-white text-emerald-700 shadow-[var(--shadow-sm)]">
                        <Icon className="size-4" />
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-ink-950)]">{filter.label}</span>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </section>
        </div>

        <aside className="hidden space-y-5 self-start xl:sticky xl:top-24 xl:block xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto">
          <Card className="h-fit border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-[var(--shadow-sm)]">
                <Compass className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                  Feed mode
                </p>
                <p className="font-display text-lg text-[var(--color-ink-950)]">Shape the feed first</p>
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
                    className={`block rounded-xl border p-4 transition ${
                      isActive
                        ? "border-emerald-300 bg-emerald-100/80 shadow-[var(--shadow-sm)]"
                        : "border-[var(--color-border)] bg-white hover:border-emerald-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-white text-emerald-700 shadow-[var(--shadow-sm)]">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--color-ink-950)]">{filter.label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-600)]">
                          {filter.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          {trending.length > 0 && (
            <Card className="border border-[var(--color-border)] bg-white p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Momentum board</p>
              <h3 className="mt-1 font-display text-lg font-black text-[var(--color-ink-950)]">Top trending picks</h3>
              <div className="mt-4 space-y-3">
                {trending.slice(0, 3).map((item) => (
                  <Link
                    key={`${item.originType}-${item.id}-sidebar`}
                    href={item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`}
                    className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 transition hover:border-emerald-200 hover:bg-emerald-50"
                  >
                    <p className="line-clamp-2 text-sm font-semibold text-[var(--color-ink-900)]">{item.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">
                      {item.destination}
                      {item.destinationState ? `, ${item.destinationState}` : ""}
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
