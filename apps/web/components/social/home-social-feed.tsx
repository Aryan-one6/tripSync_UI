"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Compass, TrendingUp, Users } from "lucide-react";
import { SocialFeedCard } from "@/components/social/social-feed-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { SocialFeedItem } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";

type FeedTab = "for-you" | "following" | "trending";

const tabs: { id: FeedTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "for-you", label: "For You", icon: Compass },
  { id: "following", label: "Following", icon: Users },
  { id: "trending", label: "Trending", icon: TrendingUp },
];

export function HomeSocialFeed({ initialItems }: { initialItems: SocialFeedItem[] }) {
  const { status, apiFetchWithAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [followingItems, setFollowingItems] = useState<SocialFeedItem[] | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (activeTab !== "following" || status !== "authenticated" || followingItems !== null) {
      return;
    }

    startTransition(() => {
      void apiFetchWithAuth<SocialFeedItem[]>("/social/feed/following?limit=20")
        .then((items) => {
          setFollowingItems(items);
        })
        .catch(() => {
          setFollowingItems([]);
        });
    });
  }, [activeTab, apiFetchWithAuth, followingItems, status]);

  // Trending: sort by joinedCount descending as a proxy for popularity
  const trendingItems = [...initialItems].sort(
    (a, b) => (b.joinedCount ?? 0) - (a.joinedCount ?? 0),
  );

  const items =
    activeTab === "for-you"
      ? initialItems
      : activeTab === "trending"
        ? trendingItems
        : (followingItems ?? []);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* Tab switcher */}
      <div className="flex items-center gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-[var(--color-surface-raised)] text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--color-ink-600)] hover:bg-white/60 hover:text-[var(--color-ink-900)]"
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Log in prompt for Following tab */}
      {activeTab === "following" && status !== "authenticated" ? (
        <EmptyState
          title="Log in to see your following feed"
          description="Follow travelers and agencies to turn the homepage into a relationship-driven feed."
          action={
            <Link href="/login?next=%2Fdiscover">
              <Button size="sm">Login</Button>
            </Link>
          }
        />
      ) : null}

      {/* Loading state */}
      {activeTab === "following" && status === "authenticated" && isPending ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-6 text-center text-sm text-[var(--color-ink-500)]">
          Loading people you follow...
        </div>
      ) : null}

      {/* Feed items */}
      {!(activeTab === "following" && status !== "authenticated") ? (
        items.length > 0 ? (
          <div className="space-y-5">
            {items.map((item) => (
              <SocialFeedCard key={`${item.originType}-${item.id}`} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              activeTab === "following"
                ? "Your following feed is empty"
                : activeTab === "trending"
                  ? "No trending trips yet"
                  : "Nothing in the feed yet"
            }
            description={
              activeTab === "following"
                ? "Follow a few travelers or agencies and their plans and packages will show up here."
                : "Publish a plan or package to bring the feed to life."
            }
          />
        )
      ) : null}
    </div>
  );
}
