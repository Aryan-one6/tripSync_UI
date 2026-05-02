"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanPrimaryAction } from "@/components/trip/plan-primary-action";
import { formatCurrency } from "@/lib/format";
import type { GroupMember, Offer } from "@/lib/api/types";

interface MobileBottomBarProps {
  groupId?: string;
  planId?: string;
  planTitle?: string;
  destination?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  creatorUserId?: string;
  offers?: Offer[];
  price: number | null;
  spotsLeft: number;
  shareUrl: string;
  requiresFemaleProfile?: boolean;
  label?: string;
  members?: GroupMember[];
}

export function MobileBottomBar({
  groupId,
  planId,
  planTitle,
  destination,
  budgetMin,
  budgetMax,
  creatorUserId,
  offers = [],
  price,
  spotsLeft,
  shareUrl,
  requiresFemaleProfile = false,
  label = "Book Now",
  members = [],
}: MobileBottomBarProps) {
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-[var(--color-surface)]/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        {/* Price info */}
        <div className="min-w-0 shrink-0">
          <p className="font-display text-base leading-tight text-[var(--color-sea-700)]">
            {formatCurrency(price)}
            <span className="text-[10px] font-normal text-[var(--color-ink-500)]"> /person</span>
          </p>
          {spotsLeft > 0 && spotsLeft <= 5 && (
            <p className="text-[10px] font-semibold text-[var(--color-sunset-600)]">
              {spotsLeft} spot{spotsLeft > 1 ? "s" : ""} left!
            </p>
          )}
        </div>

        {/* CTA buttons — pushed to the right */}
        <div className="ml-auto flex items-center gap-2">
          <a href={shareUrl} target="_blank" rel="noreferrer" className="shrink-0">
            <Button type="button" variant="secondary" size="sm" className="size-10 p-0">
              <Share2 className="size-4" />
            </Button>
          </a>
          <div className="shrink-0">
            <PlanPrimaryAction
              groupId={groupId}
              joinLabel={label}
              requiresFemaleProfile={requiresFemaleProfile}
              members={members}
              planId={planId}
              planTitle={planTitle}
              destination={destination}
              budgetMin={budgetMin}
              budgetMax={budgetMax}
              creatorUserId={creatorUserId}
              offers={offers}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
