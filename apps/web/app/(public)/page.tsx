import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HomeSocialFeed } from "@/components/social/home-social-feed";
import { getSocialFeed } from "@/lib/api/public";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const feed = await getSocialFeed({ limit: 20 });

  return (
    <div className="page-shell space-y-8 py-10">
      <Card className="relative overflow-hidden p-8">
        <div className="clay-blob -top-16 -right-16 size-40 bg-[var(--color-sea-200)] opacity-15 animate-blob" />
        <div className="clay-blob -bottom-10 -left-10 size-32 bg-[var(--color-lavender-100)] opacity-80 animate-blob delay-300" />
        <div className="relative">
          <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
            <Sparkles className="mr-1.5 size-3" />
            Social feed
          </span>
          <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[0.95] text-[var(--color-ink-950)] sm:text-5xl md:text-6xl">
            Plans and packages now live in one scroll.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-ink-600)] sm:text-lg">
            The homepage is the marketplace now: traveler plans, agency packages, and soon travel stories.
            Follow profiles to turn it into a relationship-driven feed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/plans/new">
              <Button size="lg">
                Create a plan
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/discover">
              <Button size="lg" variant="secondary">
                Open discover
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      <HomeSocialFeed initialItems={feed} />
    </div>
  );
}
