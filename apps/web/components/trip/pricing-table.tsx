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
    <div className="space-y-6">
      {/* Base price hero - more prominent */}
      <div className="rounded-2xl border-2 border-[var(--color-sea-200)] bg-gradient-to-br from-[var(--color-sea-50)] via-white to-[var(--color-sea-50)] p-8 shadow-lg">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-ink-600)]">
          Price per person
        </p>
        <div className="mt-3 flex items-baseline gap-2">
          <p className="font-display text-4xl font-bold text-[var(--color-sea-700)]">
            {formatCurrency(currentTier?.price ?? basePrice)}
          </p>
          <p className="text-sm text-[var(--color-ink-500)]">+ taxes</p>
        </div>
        {currentTier && currentTier.price < basePrice && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-sea-600)] px-3 py-2 text-sm font-semibold text-white shadow-md">
            <TrendingDown className="size-4" />
            Save {formatCurrency(basePrice - currentTier.price)} per person
          </div>
        )}
      </div>

      {/* Group discount tiers - professional table layout */}
      {hasTiers && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <Users className="size-5 text-[var(--color-sea-600)]" />
            <p className="font-semibold text-[var(--color-ink-800)]">
              Group Discounts
            </p>
            <p className="text-sm text-[var(--color-ink-600)]">
              More travelers = Lower price
            </p>
          </div>
          <div className="space-y-2.5">
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
                    "flex items-center justify-between rounded-xl border-2 px-4 py-4 transition-all duration-300",
                    isActive
                      ? "border-[var(--color-sea-500)] bg-gradient-to-r from-[var(--color-sea-50)] to-white shadow-md"
                      : "border-[var(--color-ink-100)] bg-white hover:border-[var(--color-sea-200)]",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-lg font-bold text-sm",
                        isActive
                          ? "bg-gradient-to-br from-[var(--color-sea-500)] to-[var(--color-sea-600)] text-white shadow-md"
                          : "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]",
                      )}
                    >
                      {tier.minPax}+
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-ink-800)]">
                        {tier.minPax}–{maxForTier} travelers
                      </p>
                      {savings > 0 && (
                        <p className="text-xs text-[var(--color-sea-600)] mt-0.5">
                          Save {formatCurrency(savings)}/person
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "font-display text-xl font-bold",
                        isActive ? "text-[var(--color-sea-700)]" : "text-[var(--color-ink-700)]",
                      )}
                    >
                      {formatCurrency(tier.price)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Group size range info - subtle info box */}
      <div className="rounded-lg bg-[var(--color-sea-50)] border border-[var(--color-sea-200)] px-4 py-3">
        <p className="text-sm text-[var(--color-ink-700)]">
          <span className="font-semibold">Group size:</span> {groupSizeMin}–{groupSizeMax} travelers
          {currentSize > 0 && (
            <> • <span className="text-[var(--color-sea-700)] font-semibold">{currentSize} enrolled</span></>
          )}
        </p>
      </div>
    </div>
  );
}
