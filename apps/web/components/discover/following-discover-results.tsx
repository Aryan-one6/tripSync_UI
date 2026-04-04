"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { DiscoverCard } from "@/components/cards/discover-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth/auth-context";
import type { DiscoverItem } from "@/lib/api/types";

interface FollowingDiscoverResultsProps {
  query: {
    q?: string;
    audience?: "traveler" | "agency";
    destination?: string;
    vibes?: string;
    originType?: "plan" | "package";
    sort?: "recent" | "price_low" | "price_high" | "popular";
  };
}

export function FollowingDiscoverResults({ query }: FollowingDiscoverResultsProps) {
  const { status, apiFetchWithAuth } = useAuth();
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (status !== "authenticated") {
      setItems([]);
      setHasLoaded(true);
      return;
    }

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      q: query.q,
      audience: query.audience,
      destination: query.destination,
      vibes: query.vibes,
      originType: query.originType,
      sort: query.sort ?? "recent",
    })) {
      if (value) {
        params.set(key, value);
      }
    }

    startTransition(() => {
      void apiFetchWithAuth<DiscoverItem[]>(`/discover/following?${params.toString()}`)
        .then((data) => {
          setItems(data);
        })
        .catch(() => {
          setItems([]);
        })
        .finally(() => {
          setHasLoaded(true);
        });
    });
  }, [apiFetchWithAuth, query.audience, query.destination, query.originType, query.q, query.sort, query.vibes, status]);

  if (status !== "authenticated") {
    return (
      <EmptyState
        title="Log in to use Following"
        description="Following shows plans and packages published by travelers and agencies you already follow."
        action={
          <Link href="/login?next=%2Fdiscover%3Frail%3Dfollowing">
            <Button size="sm">Login</Button>
          </Link>
        }
      />
    );
  }

  if (!hasLoaded || isPending) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-10 text-center text-sm text-[var(--color-ink-500)]">
        Loading followed travelers and agencies...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No listings from people you follow"
        description="Follow more travelers or agencies, or switch back to For You or Trending."
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {items.map((item) => (
        <DiscoverCard key={`${item.originType}-${item.id}`} item={item} />
      ))}
    </div>
  );
}
