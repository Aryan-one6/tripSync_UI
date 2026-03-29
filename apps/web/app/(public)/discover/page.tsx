import Link from "next/link";
import { TrendingUp, MapPin } from "lucide-react";
import { DiscoverCard } from "@/components/cards/discover-card";
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

  const items = q
    ? await searchDiscover(q)
    : await getDiscoverItems({ destination, vibes, originType, sort });

  const trending = await getTrendingItems();

  return (
    <div className="page-shell space-y-8 py-10">
      <SectionHeading
        eyebrow="Discover"
        title="Search live plans, compare market-ready packages"
        description="Filter by destination, budget, dates, vibe, or trip format. The feed merges user-created plans and agency inventory into one browsing surface."
      />

      {/* Filters */}
      <Card className="relative overflow-hidden p-5">
        <div className="relative space-y-4">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
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
              <Link key={vibe} href={`/discover?vibes=${encodeURIComponent(vibe)}`}>
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
          {items.length === 0 ? (
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
        <Card className="h-fit p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Trending now</p>
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
  );
}
