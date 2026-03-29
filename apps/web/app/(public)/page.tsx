import Link from "next/link";
import { Search } from "lucide-react";
import { HomeSocialFeed } from "@/components/social/home-social-feed";
import { getSocialFeed } from "@/lib/api/public";

export const dynamic = "force-dynamic";

const trendingDestinations = [
  "Himachal",
  "Goa",
  "Ladakh",
  "Rajasthan",
  "Kerala",
  "Uttarakhand",
];

export default async function HomePage() {
  const feed = await getSocialFeed({ limit: 20 });

  return (
    <div className="page-shell space-y-6 py-6">
      {/* Compact Hero — max ~200px */}
      <section
        className="relative overflow-hidden rounded-[var(--radius-xl)] px-6 py-8"
        style={{
          background:
            "linear-gradient(to bottom, var(--color-sea-50), transparent)",
        }}
      >
        {/* Heading */}
        <h1 className="font-display text-2xl font-bold leading-tight text-[var(--color-ink-950)] sm:text-3xl">
          Discover your next adventure
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-600)]">
          Group trips, agency packages, and travel stories
        </p>

        {/* Inline search bar */}
        <form
          action="/discover"
          method="get"
          className="mt-4 flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2.5 shadow-[var(--shadow-sm)] max-w-lg"
        >
          <Search className="size-4 shrink-0 text-[var(--color-ink-400)]" />
          <input
            id="hero-search"
            type="text"
            name="q"
            placeholder="Search destinations, trips, agencies…"
            className="flex-1 bg-transparent text-sm text-[var(--color-ink-900)] placeholder:text-[var(--color-ink-400)] outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-[var(--color-sea-600)] px-4 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--color-sea-700)] transition-colors"
          >
            Search
          </button>
        </form>

        {/* Trending destination pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {trendingDestinations.map((dest) => (
            <Link
              key={dest}
              href={`/discover?q=${encodeURIComponent(dest)}`}
              className="rounded-full border border-[var(--color-border)] bg-white px-3.5 py-1.5 text-xs font-medium text-[var(--color-ink-700)] shadow-[var(--shadow-sm)] transition hover:border-[var(--color-sea-200)] hover:bg-[var(--color-sea-50)] hover:text-[var(--color-sea-700)]"
            >
              {dest}
            </Link>
          ))}
        </div>
      </section>

      {/* Social feed with For You / Following / Trending tabs */}
      <HomeSocialFeed initialItems={feed} />
    </div>
  );
}
