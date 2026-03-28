import { Users, TrendingDown } from "lucide-react";
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
}

export function PricingTable({
  basePrice,
  tiers,
  groupSizeMin,
  groupSizeMax,
  currentSize = 0,
}: PricingTableProps) {
  const sortedTiers = [...(tiers ?? [])].sort((a, b) => a.minPax - b.minPax);
  const hasTiers = sortedTiers.length > 0;

  // Find which tier the current group size falls into
  const currentTier = hasTiers
    ? sortedTiers
        .filter((t) => currentSize >= t.minPax)
        .at(-1)
    : null;

  return (
    <div className="space-y-4">
      {/* Base price hero */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-sea-100)] bg-gradient-to-br from-[var(--color-sea-50)] to-white p-5 shadow-[var(--shadow-clay)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          Price per person
        </p>
        <p className="mt-1 font-display text-3xl text-[var(--color-sea-700)]">
          {formatCurrency(currentTier?.price ?? basePrice)}
        </p>
        <p className="mt-1 text-xs text-[var(--color-ink-500)]">
          + taxes as applicable
        </p>
        {currentTier && currentTier.price < basePrice && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-sea-600)] px-2.5 py-1 text-[10px] font-bold text-white">
            <TrendingDown className="size-3" />
            You save {formatCurrency(basePrice - currentTier.price)} per person
          </div>
        )}
      </div>

      {/* Group discount tiers */}
      {hasTiers && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Users className="size-4 text-[var(--color-sea-600)]" />
            <p className="text-xs font-semibold text-[var(--color-ink-700)]">
              Group discount — more people, lower price
            </p>
          </div>
          <div className="space-y-1.5">
            {sortedTiers.map((tier, i) => {
              const isActive = currentTier?.minPax === tier.minPax;
              const savings = basePrice - tier.price;
              const nextTier = sortedTiers[i + 1];
              const maxForTier = nextTier
                ? nextTier.minPax - 1
                : groupSizeMax;

              return (
                <div
                  key={tier.minPax}
                  className={cn(
                    "flex items-center justify-between rounded-[var(--radius-sm)] border px-4 py-3 transition-all",
                    isActive
                      ? "border-[var(--color-sea-200)] bg-[var(--color-sea-50)] shadow-[var(--shadow-clay-sm)]"
                      : "border-white/40 bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-inset)]",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                        isActive
                          ? "bg-[var(--color-sea-600)] text-white shadow-[var(--shadow-clay-sea)]"
                          : "bg-[var(--color-surface-raised)] text-[var(--color-ink-500)] shadow-[var(--shadow-clay-sm)]",
                      )}
                    >
                      {tier.minPax}+
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink-800)]">
                        {tier.minPax}–{maxForTier} travelers
                      </p>
                      {savings > 0 && (
                        <p className="text-[10px] text-[var(--color-sea-600)]">
                          Save {formatCurrency(savings)}/person
                        </p>
                      )}
                    </div>
                  </div>
                  <p
                    className={cn(
                      "font-display text-lg",
                      isActive ? "text-[var(--color-sea-700)]" : "text-[var(--color-ink-700)]",
                    )}
                  >
                    {formatCurrency(tier.price)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Group size range info */}
      <div className="rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] px-4 py-3 shadow-[var(--shadow-clay-inset)]">
        <p className="text-xs text-[var(--color-ink-600)]">
          Group size: <span className="font-semibold">{groupSizeMin}–{groupSizeMax}</span> travelers.
          {currentSize > 0 && (
            <> Currently <span className="font-semibold text-[var(--color-sea-700)]">{currentSize}</span> enrolled.</>
          )}
        </p>
      </div>
    </div>
  );
}
