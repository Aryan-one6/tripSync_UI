import Link from "next/link";
import { ArrowRight, Compass, Filter, Layers3, Sparkles } from "lucide-react";
import { AgencyCard } from "@/components/cards/agency-card";
import { DiscoverCard } from "@/components/cards/discover-card";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getAgencies, getDiscoverItems, getTrendingItems } from "@/lib/api/public";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, trending, agencies] = await Promise.all([
    getDiscoverItems({ sort: "recent" }),
    getTrendingItems(),
    getAgencies(),
  ]);

  return (
    <div className="space-y-16 py-10">
      {/* Hero */}
      <section className="page-shell">
        <Card className="relative overflow-hidden p-0">
          <div className="clay-blob -top-16 -right-16 size-48 bg-[var(--color-sea-200)] opacity-15 animate-blob" />
          <div className="clay-blob -bottom-12 -left-12 size-36 bg-[var(--color-sunset-200)] opacity-10 animate-blob delay-300" />

          <div className="relative grid gap-8 p-8 lg:grid-cols-[1.3fr_0.9fr] lg:p-10">
            <div className="animate-rise-in">
              <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                <Sparkles className="mr-1.5 size-3" />
                Social travel marketplace
              </span>
              <h1 className="mt-5 max-w-3xl font-display text-4xl leading-[0.96] text-[var(--color-ink-950)] sm:text-5xl md:text-7xl">
                Build the trip first. Let the right group find it.
              </h1>
              <p className="mt-6 max-w-2xl text-base text-[var(--color-ink-600)] leading-relaxed sm:text-lg">
                TravellersIn blends user-created travel intent with agency packages, live offer comparison,
                and structured group discovery for Indian social travel.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/discover">
                  <Button size="lg">
                    <Compass className="size-4" />
                    Explore live trips
                  </Button>
                </Link>
                <Link href="/dashboard/plans/new">
                  <Button size="lg" variant="secondary">
                    Plan a trip
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
              <CardInset className="space-y-3 transition-all hover:shadow-[var(--shadow-clay)] hover:-translate-y-0.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                    <Layers3 className="size-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Discover feed</p>
                    <p className="font-display text-lg text-[var(--color-ink-950)]">Plans + packages in one view</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-ink-600)] leading-relaxed">
                  Search by destination, dates, budget, vibe, and origin. Public pages stay crawlable and mobile-first.
                </p>
              </CardInset>
              <CardInset className="space-y-3 transition-all hover:shadow-[var(--shadow-clay)] hover:-translate-y-0.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
                    <Filter className="size-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Structured decision flow</p>
                    <p className="font-display text-lg text-[var(--color-ink-950)]">Compare offers, then decide</p>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-ink-600)] leading-relaxed">
                  No overloaded screens. Every surface has one clear primary action: explore, join, compare, or publish.
                </p>
              </CardInset>
            </div>
          </div>
        </Card>
      </section>

      {/* Featured */}
      <section className="page-shell space-y-6">
        <SectionHeading
          eyebrow="Fresh on the marketplace"
          title="Latest plans and packages"
          description="The landing feed mixes social intent and curated inventory so both travelers and agencies can read the market immediately."
          action={
            <Link href="/discover">
              <Button variant="secondary" size="sm">
                See full discover feed
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {featured.slice(0, 6).map((item) => (
            <DiscoverCard key={`${item.originType}-${item.id}`} item={item} />
          ))}
        </div>
      </section>

      {/* Trending */}
      <section className="page-shell space-y-6">
        <SectionHeading
          eyebrow="Trending"
          title="What groups are gathering around"
          description="Open plans and packages ordered by current join momentum."
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {trending.slice(0, 3).map((item) => (
            <DiscoverCard key={`${item.originType}-${item.id}`} item={item} />
          ))}
        </div>
      </section>

      {/* Agencies */}
      <section className="page-shell space-y-6 pb-10">
        <SectionHeading
          eyebrow="Agency network"
          title="Travel operators ready to respond"
          description="Browse verified-style profiles with packages, destination focus, and social proof."
          action={
            <Link href="/agencies">
              <Button variant="secondary" size="sm">
                Browse agencies
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {agencies.slice(0, 4).map((agency) => (
            <AgencyCard key={agency.id} agency={agency} />
          ))}
        </div>
      </section>
    </div>
  );
}
