"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Compass, Users } from "lucide-react";
import { SocialFeedCard } from "@/components/social/social-feed-card";
import { Button } from "@/components/ui/button";
import { CardInset } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { SocialFeedItem } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";

type FeedTab = "for-you" | "following";

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

  const items = activeTab === "for-you" ? initialItems : followingItems ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <CardInset className="p-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("for-you")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "for-you"
                ? "bg-[var(--color-surface-raised)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]"
                : "text-[var(--color-ink-600)] hover:bg-white/60"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Compass className="size-4" />
              For you
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("following")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "following"
                ? "bg-[var(--color-surface-raised)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]"
                : "text-[var(--color-ink-600)] hover:bg-white/60"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <Users className="size-4" />
              Following
            </span>
          </button>
        </div>
      </CardInset>

      {activeTab === "following" && status !== "authenticated" ? (
        <EmptyState
          title="Log in to see your following feed"
          description="Follow travelers and agencies to turn the homepage into a relationship-driven feed."
          action={
            <Link href="/login?next=%2F">
              <Button size="sm">Login</Button>
            </Link>
          }
        />
      ) : null}

      {activeTab === "following" && status === "authenticated" && isPending ? (
        <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
          Loading people you follow...
        </CardInset>
      ) : null}

      {!(activeTab === "following" && status !== "authenticated") ? (
        items.length > 0 ? (
          <div className="space-y-6">
            {items.map((item) => (
              <SocialFeedCard key={`${item.originType}-${item.id}`} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={activeTab === "following" ? "Your following feed is empty" : "Nothing in the feed yet"}
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
