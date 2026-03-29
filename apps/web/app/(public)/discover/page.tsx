import Link from "next/link";
import { Compass, Search, TrendingUp, MapPin, Users } from "lucide-react";
import { DiscoverCard } from "@/components/cards/discover-card";
import { FollowingDiscoverResults } from "@/components/discover/following-discover-results";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SectionHeading } from "@/components/ui/section-heading";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getDiscoverItems, getTrendingItems, searchDiscover } from "@/lib/api/public";
import { VIBE_OPTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const trendingDestinations = [
  "Himachal",
  "Goa",
  "Ladakh",
  "Rajasthan",
  "Kerala",
  "Uttarakhand",
];

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
  const rail =
    params.rail === "following" || params.rail === "trending" || params.rail === "for-you"
      ? params.rail
      : "for-you";

  const [forYouItems, trending] = await Promise.all([
    q ? searchDiscover(q) : getDiscoverItems({ destination, vibes, originType, sort }),
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
      destination: destination || undefined,
      vibes: vibes || undefined,
      originType,
      sort,
      rail,
      ...overrides,
    })) {
      if (value) {
        nextParams.set(key, value);
      }
    }

    const queryString = nextParams.toString();
    return queryString ? `/discover?${queryString}` : "/discover";
  }

  return (
    <div className="page-shell space-y-10 py-6 sm:py-8">
    
      <SectionHeading
        eyebrow="Discover"
        title="Search live plans, compare market-ready packages"
        description="Filter by destination, budget, dates, vibe, or trip format. The browsing grid still merges traveler plans and agency inventory into one surface."
      />

      {/* Filters */}
      <Card className="relative overflow-hidden p-5">
        <div className="relative space-y-4">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
            <input type="hidden" name="rail" value={rail} />
            <Input name="q" defaultValue={q} placeholder="Search destination or trip title" />
            <Input name="destination" defaultValue={destination} placeholder="Destination" />
            <Select
              name="originType"
              defaultValue={originType ?? ""}
              options={[
                { value: "", label: "All listing types" },
                { value: "plan", label: "User plans" },
                { value: "package", label: "Agency packages" },
              ]}
            />
            <Select
              name="sort"
              defaultValue={sort}
              options={[
                { value: "recent", label: "Most recent" },
                { value: "popular", label: "Trending" },
                { value: "price_low", label: "Price: low to high" },
                { value: "price_high", label: "Price: high to low" },
              ]}
            />
            <Button type="submit">Apply</Button>
          </form>
          <div className="flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((vibe) => (
              <Link key={vibe} href={buildDiscoverHref({ vibes: vibe })}>
                <Badge
                  variant={vibes === vibe ? "sea" : "default"}
                  className="cursor-pointer transition-all hover:shadow-[var(--shadow-clay-sm)] hover:-translate-y-0.5"
                >
                  {vibe}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </Card>

      {/* Results + sidebar */}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {rail === "following" ? (
            <FollowingDiscoverResults
              query={{
                q: q || undefined,
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
            <div className="grid gap-5 sm:grid-cols-2">
              {items.map((item) => (
                <DiscoverCard key={`${item.originType}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Trending sidebar */}
        <div className="space-y-5">
          <Card className="h-fit p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                <Compass className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                  Major filters
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
                    className={`block rounded-[var(--radius-lg)] border p-4 transition ${
                      isActive
                        ? "border-[var(--color-sea-200)] bg-[var(--color-sea-50)] shadow-[var(--shadow-md)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-sea-100)] hover:shadow-[var(--shadow-sm)]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-white text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]">
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

          <Card className="h-fit p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                  Trending now
                </p>
                <p className="font-display text-lg text-[var(--color-ink-950)]">Picking up momentum</p>
              </div>
            </div>
            <div className="space-y-3">
              {trending.slice(0, 4).map((item) => (
                <Link
                  key={`${item.originType}-${item.id}`}
                  href={item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`}
                >
                  <CardInset className="group space-y-1.5 transition-all hover:shadow-[var(--shadow-clay)] hover:-translate-y-0.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={item.originType === "plan" ? "sea" : "sunset"}>
                        {item.originType === "plan" ? "Community plan" : "Agency package"}
                      </Badge>
                      <Badge variant="outline">
                        {item.originType === "plan" ? "Traveler-created" : "Agency-created"}
                      </Badge>
                    </div>
                    <p className="truncate font-display text-base text-[var(--color-ink-950)]">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-ink-600)]">
                      <MapPin className="size-3" />
                      {item.destination}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-inset)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)]"
                          style={{ width: `${Math.min(100, (item.joinedCount / item.groupSizeMax) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-sea-700)]">
                        {item.joinedCount}/{item.groupSizeMax}
                      </span>
                    </div>
                  </CardInset>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
