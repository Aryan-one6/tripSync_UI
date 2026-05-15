import Link from "next/link";
import { Compass, TrendingUp, Users, Building2, Layers } from "lucide-react";
import { DiscoverCard, DiscoverCardCompact } from "@/components/cards/discover-card";
import { AgencyPlanFilterCards } from "@/components/discover/agency-plan-filter-cards";
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

type QuickFilter = (typeof QUICK_FILTERS_BASE)[number];
type AnyFilter = QuickFilter;

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
  const listingTypeFilters = [
    {
      id: "all",
      label: "All Listings",
      description: "Show both community plans and agency packages.",
      originType: undefined as undefined | "plan" | "package",
      icon: Layers,
    },
    {
      id: "community",
      label: "Community Plans",
      description: "User/community-created travel plans.",
      originType: "plan" as const,
      icon: Users,
    },
    {
      id: "agency",
      label: "Agency Packages",
      description: "Packages published by verified agencies.",
      originType: "package" as const,
      icon: Building2,
    },
  ] as const;

  return (
    <div className="page-shell pb-mobile-nav">
     <section className="relative mb-5 mt-3 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:px-5 sm:py-4">
  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(6,182,212,0.10),transparent_32%)]" />

  <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-[var(--color-sea-500)] shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--color-sea-700)]">
          Live Trip Marketplace
        </p>
      </div>

      <h1 className="mt-2 font-display text-[clamp(1.45rem,3vw,2rem)] font-black leading-none tracking-tight text-[var(--color-ink-950)]">
        Discover Better Trips.
      </h1>

      <p className="mt-1.5 max-w-xl text-[13px] leading-snug text-[var(--color-ink-600)] sm:text-sm">
        Compare live plans and packages by destination, budget, and vibe.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-2 sm:w-[230px]">
      <div className="rounded-xl border border-[var(--color-border)] bg-white/80 px-3 py-2 shadow-[0_6px_18px_rgba(15,23,42,0.04)] backdrop-blur">
        <p className="text-base font-black leading-none text-[var(--color-ink-950)]">
          {items.length.toLocaleString("en-IN")}
        </p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
          Live Results
        </p>
      </div>

      <div className="rounded-xl border border-[var(--color-sea-500)]/20 bg-[var(--color-sea-50)] px-3 py-2 shadow-[0_6px_18px_rgba(16,185,129,0.08)]">
        <p className="text-base font-black leading-none text-[var(--color-sea-700)]">
          {trending.length.toLocaleString("en-IN")}
        </p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--color-sea-700)]">
          Trending
        </p>
      </div>
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

      <AgencyPlanFilterCards
        audience={audience}
        q={q}
        destination={destination}
        vibes={vibes}
        originType={originType}
        planType={planType}
        sort={sort}
        rail={rail}
      />

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
          <section className="  p-2 sm:p-6">
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
            <section className="  sm:p-6">
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
            <Card className="h-fit border border-[var(--color-border)] bg-[linear-gradient(170deg,#f2fbf7_0%,#ffffff_56%)] p-4 shadow-[var(--shadow-sm)]">
              <div className="mb-3.5 flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-[var(--shadow-sm)]">
                  <Compass className="size-[18px]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                    Feed mode
                  </p>
                  <p className="font-display text-[15px] leading-tight text-[var(--color-ink-950)]">Choose your lane</p>
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
                      className={`group flex items-center gap-2.5 rounded-lg border px-2.5 py-2.5 transition ${isActive
                        ? "border-emerald-300 bg-emerald-50 shadow-[var(--shadow-sm)]"
                        : "border-[var(--color-border)] bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                        }`}
                    >
                      <div
                        className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition ${isActive
                          ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-500)] group-hover:border-emerald-200 group-hover:text-emerald-700"
                          }`}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      <span className="text-sm font-semibold text-[var(--color-ink-950)]">{filter.label}</span>
                      {isActive && (
                        <span className="ml-auto rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                          Active
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </Card>
          </section>
        </div>

        <aside className="hidden space-y-4 self-start xl:sticky xl:top-24 xl:block xl:max-h-[calc(100dvh-7rem)] xl:overflow-y-auto">
          <div className="h-fit overflow-hidden  ">
            {/* <div className="bg-[linear-gradient(140deg,#064e3b_0%,#059669_50%,#34d399_100%)]  text-white sm:p-5">
              <div className="flex items-center gap-3">
                

                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100">
                    Feed mode
                  </p>
                  <h3 className="mt-0.5 font-display text-lg font-semibold leading-tight sm:text-xl">
                    Shape the feed first
                  </h3>
                </div>
              </div>
            
            </div> */}

            <div className="grid gap-2 p-3 sm:p-4">
              {majorFilters.map((filter) => {
                const Icon = filter.icon;
                const isActive = rail === filter.id;

                return (
                  <Link
                    key={filter.id}
                    href={buildDiscoverHref({ rail: filter.id })}
                    className={`group relative overflow-hidden rounded-xl border p-3 transition-all duration-200 sm:p-3.5 ${isActive
                      ? "border-emerald-300 bg-emerald-50 shadow-[0_10px_30px_rgba(16,185,129,0.12)]"
                      : "border-[var(--color-border)] bg-white hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
                      }`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 w-1 transition ${isActive ? "bg-emerald-600" : "bg-transparent group-hover:bg-emerald-400"
                        }`}
                    />

                    <div className="flex gap-3">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl transition ${isActive
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100"
                          }`}
                      >
                        <Icon className="size-4.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-bold leading-tight text-[var(--color-ink-950)] sm:text-[0.95rem]">
                            {filter.label}
                          </p>

                          {isActive && (
                            <span className="shrink-0 rounded-full bg-[var(--color-amber-500)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--color-ink-600)] sm:text-[0.82rem]">
                          {filter.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden p-2">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-600">Listing type</p>
                <h3 className="mt-1 font-display text-base font-black text-[var(--color-ink-950)]">
                  Filter by source
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              {listingTypeFilters.map((filter) => {
                const Icon = filter.icon;
                const isActive =
                  filter.id === "all" ? !originType : originType === filter.originType;

                return (
                  <Link
                    key={filter.id}
                    href={buildDiscoverHref({
                      originType: filter.originType,
                      planType: filter.originType === "package" ? undefined : planType,
                    })}
                    className={`group block rounded-lg border px-3 py-2.5 transition ${
                      isActive
                        ? "border-emerald-300 bg-emerald-50 shadow-[0_8px_20px_rgba(16,185,129,0.1)]"
                        : "border-[var(--color-border)] bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                          isActive
                            ? "bg-emerald-600 text-white"
                            : "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100"
                        }`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                          {filter.label}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--color-ink-600)]">
                          {filter.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

      
        </aside>
      </div>
    </div>
  );
}
