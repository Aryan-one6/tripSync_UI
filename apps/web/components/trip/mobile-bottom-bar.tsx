"use client";

import { Share2 } from "lucide-react";
import { JoinTripButton } from "@/components/forms/join-trip-button";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

interface MobileBottomBarProps {
  groupId?: string;
  price: number | null;
  spotsLeft: number;
  shareUrl: string;
  requiresFemaleProfile?: boolean;
  label?: string;
}

export function MobileBottomBar({
  groupId,
  price,
  spotsLeft,
  shareUrl,
  requiresFemaleProfile = false,
  label = "Join this trip",
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
            <JoinTripButton
              groupId={groupId}
              label={label}
              requiresFemaleProfile={requiresFemaleProfile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
