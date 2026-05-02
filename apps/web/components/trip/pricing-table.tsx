"use client";

import { useRouter } from "next/navigation";
import { Users, TrendingDown, Ticket, MessageCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PricingTier {
  minPax: number;
  price: number;
}

interface PricingTableProps {
  basePrice: number;
  tiers?: PricingTier[] | null;
  groupSizeMin: number;
  groupSizeMax: number;
  currentSize?: number;
  groupId?: string;
}

export function PricingTable({
  basePrice,
  tiers,
  groupSizeMin,
  groupSizeMax,
  currentSize = 0,
  groupId,
}: PricingTableProps) {
  const { session, status } = useAuth();
  const router = useRouter();

  const sortedTiers = [...(tiers ?? [])].sort((a, b) => a.minPax - b.minPax);
  const hasTiers = sortedTiers.length > 0;

  const currentTier = hasTiers
    ? sortedTiers.filter((t) => currentSize >= t.minPax).at(-1)
    : null;

  const activePrice = currentTier?.price ?? basePrice;
  const isFull = currentSize >= groupSizeMax;
  const isLoggedIn = !!session && status === "authenticated";
  const checkoutHref = groupId ? `/dashboard/groups/${groupId}/checkout` : "/dashboard";

  function handleBookNow() {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (groupId) {
      router.push(checkoutHref);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Price hero ── */}
      <div className="rounded-xl border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-500)]">Price per person</p>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <p className="font-display text-3xl font-bold text-[var(--color-sea-700)]">
            {formatCurrency(activePrice)}
          </p>
          <p className="text-sm text-[var(--color-ink-400)]">+ taxes</p>
        </div>
        {currentTier && currentTier.price < basePrice && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-sea-600)] px-2.5 py-1 text-xs font-semibold text-white">
            <TrendingDown className="size-3" />
            Save {formatCurrency(basePrice - currentTier.price)}/person
          </div>
        )}

        {/* ── CTA Buttons ── */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="flex-1 gap-2 h-11 text-sm font-bold"
            disabled={isFull || !groupId}
            onClick={handleBookNow}
          >
            {!isLoggedIn ? (
              <>
                <LogIn className="size-4" />
                Login to Book
              </>
            ) : isFull ? (
              <>Group Full</>
            ) : (
              <>
                <Ticket className="size-4" />
                Book Now — Pay ₹{(activePrice).toLocaleString("en-IN")}
              </>
            )}
          </Button>
          {isLoggedIn && groupId && (
            <Button
              type="button"
              variant="secondary"
              className="gap-2 h-11 text-sm sm:w-auto w-full"
              onClick={() => router.push(`/dashboard/messages?groupId=${encodeURIComponent(groupId)}`)}
            >
              <MessageCircle className="size-4" />
              Chat
            </Button>
          )}
        </div>

        {!isLoggedIn && (
          <p className="mt-2 text-center text-xs text-[var(--color-ink-400)]">
            You&apos;ll be redirected to login, then back here automatically.
          </p>
        )}
      </div>

      {/* ── Group discount tiers ── */}
      {hasTiers && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Users className="size-4 text-[var(--color-sea-600)]" />
            <p className="text-sm font-semibold text-[var(--color-ink-800)]">Group Discounts</p>
            <p className="text-xs text-[var(--color-ink-500)]">· More travelers = lower price</p>
          </div>
          <div className="space-y-2">
            {sortedTiers.map((tier, i) => {
              const isActive = currentTier?.minPax === tier.minPax;
              const savings = basePrice - tier.price;
              const nextTier = sortedTiers[i + 1];
              const maxForTier = nextTier ? nextTier.minPax - 1 : groupSizeMax;

              return (
                <div
                  key={tier.minPax}
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-4 py-3 transition-all",
                    isActive
                      ? "border-[var(--color-sea-400)] bg-[var(--color-sea-50)] shadow-sm"
                      : "border-[var(--color-border)] bg-white hover:border-[var(--color-sea-200)]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex size-8 items-center justify-center rounded-lg text-xs font-bold",
                      isActive
                        ? "bg-[var(--color-sea-600)] text-white"
                        : "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]",
                    )}>
                      {tier.minPax}+
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink-800)]">
                        {tier.minPax}–{maxForTier} travelers
                      </p>
                      {savings > 0 && (
                        <p className="text-xs text-[var(--color-sea-600)]">
                          Save {formatCurrency(savings)}/person
                        </p>
                      )}
                    </div>
                  </div>
                  <p className={cn(
                    "font-display text-lg font-bold",
                    isActive ? "text-[var(--color-sea-700)]" : "text-[var(--color-ink-700)]",
                  )}>
                    {formatCurrency(tier.price)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Group size note ── */}
      <p className="text-xs text-[var(--color-ink-500)] rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5">
        <span className="font-semibold text-[var(--color-ink-700)]">Group size:</span>{" "}
        {groupSizeMin}–{groupSizeMax} travelers
        {currentSize > 0 && (
          <> · <span className="font-semibold text-[var(--color-sea-700)]">{currentSize} enrolled</span></>
        )}
        {isFull && <span className="ml-2 font-semibold text-red-600">· Group Full</span>}
      </p>
    </div>
  );
}
