"use client";

import { Calendar, Users, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppShareButton } from "@/components/ui/whatsapp-share-button";
import { PlanPrimaryAction } from "@/components/trip/plan-primary-action";
import { formatCurrency, formatDateRange } from "@/lib/format";
import type { GroupMember, Offer } from "@/lib/api/types";

interface BookingSidebarProps {
  groupId?: string;
  planId?: string;
  planTitle?: string;
  destination?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  creatorUserId?: string;
  offers?: Offer[];
  price: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  groupSizeMax: number;
  currentSize: number;
  spotsLeft: number;
  shareUrl: string;
  requiresFemaleProfile?: boolean;
  departureDates?: string[] | null;
  label?: string;
  members?: GroupMember[];
  compact?: boolean;
  showQuickActions?: boolean;
}

export function BookingSidebar({
  groupId,
  planId,
  planTitle,
  destination,
  budgetMin,
  budgetMax,
  creatorUserId,
  offers = [],
  price,
  startDate,
  endDate,
  groupSizeMax,
  currentSize,
  spotsLeft,
  shareUrl,
  requiresFemaleProfile = false,
  departureDates,
  label = "Join this trip",
  members = [],
  compact = false,
  showQuickActions = !compact,
}: BookingSidebarProps) {
  return (
    <div className={compact ? "space-y-2.5" : "space-y-4"}>
      {/* Price card - premium design */}
      <div className={compact
        ? "rounded-xl border border-[var(--color-sea-200)] bg-gradient-to-br from-[var(--color-sea-50)] to-white p-4 shadow-md"
        : "rounded-2xl border-2 border-[var(--color-sea-200)] bg-gradient-to-br from-[var(--color-sea-50)] to-white p-6 shadow-lg"}
      >
        <p className={compact
          ? "text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-600)]"
          : "text-xs font-bold uppercase tracking-wider text-[var(--color-ink-600)]"}
        >
          Starting from
        </p>
        <div className={compact ? "mt-1.5 flex items-baseline gap-1" : "mt-2 flex items-baseline gap-1.5"}>
          <p className={compact
            ? "font-display text-3xl font-bold text-[var(--color-sea-700)]"
            : "font-display text-4xl font-bold text-[var(--color-sea-700)]"}
          >
            {formatCurrency(price)}
          </p>
          <p className={compact ? "text-xs text-[var(--color-ink-500)]" : "text-sm text-[var(--color-ink-500)]"}>/person</p>
        </div>
        <p className={compact ? "mt-0.5 text-[11px] text-[var(--color-ink-500)]" : "mt-1 text-xs text-[var(--color-ink-500)]"}>
          + taxes as applicable
        </p>

        {/* Quick info - better layout */}
        <div className={compact ? "mt-3 space-y-2.5" : "mt-5 space-y-3"}>
          <div className={compact ? "flex items-center gap-2.5" : "flex items-center gap-3"}>
            <Calendar className={compact ? "size-4 text-[var(--color-sea-600)]" : "size-5 text-[var(--color-sea-600)]"} />
            <div className="min-w-0">
              <p className={compact ? "text-[11px] font-semibold text-[var(--color-ink-600)]" : "text-xs font-semibold text-[var(--color-ink-600)]"}>
                Dates
              </p>
              <p className={compact ? "text-xs text-[var(--color-ink-800)]" : "text-sm text-[var(--color-ink-800)]"}>
                {formatDateRange(startDate, endDate)}
              </p>
            </div>
          </div>
          <div className={compact ? "flex items-center gap-2.5" : "flex items-center gap-3"}>
            <Users className={compact ? "size-4 text-[var(--color-sea-600)]" : "size-5 text-[var(--color-sea-600)]"} />
            <div className="min-w-0">
              <p className={compact ? "text-[11px] font-semibold text-[var(--color-ink-600)]" : "text-xs font-semibold text-[var(--color-ink-600)]"}>
                Group Status
              </p>
              <p className={compact ? "text-xs text-[var(--color-ink-800)]" : "text-sm text-[var(--color-ink-800)]"}>
                {currentSize}/{groupSizeMax} enrolled
                {spotsLeft > 0 && spotsLeft <= 5 && (
                  <span className="ml-2 font-semibold text-[var(--color-sunset-600)]">
                    {spotsLeft} spots left
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Departure dates - upgraded design */}
        {departureDates && departureDates.length > 1 && (
          <div className={compact
            ? "mt-3 rounded-lg bg-[var(--color-sea-50)] p-2.5 border border-[var(--color-sea-200)]"
            : "mt-5 rounded-lg bg-[var(--color-sea-50)] p-3 border border-[var(--color-sea-200)]"}
          >
            <p className={compact
              ? "mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-sea-700)]"
              : "text-xs font-bold uppercase tracking-wider text-[var(--color-sea-700)] mb-2"}
            >
              Available Batches
            </p>
            <div className={compact ? "flex flex-wrap gap-1.5" : "flex flex-wrap gap-2"}>
              {departureDates.slice(0, 4).map((date) => (
                <span
                  key={date}
                  className={compact
                    ? "rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-[var(--color-sea-700)] shadow-sm border border-[var(--color-sea-200)]"
                    : "rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-sea-700)] shadow-sm border border-[var(--color-sea-200)]"}
                >
                  {new Date(date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              ))}
              {departureDates.length > 4 && (
                <span className="px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-600)]">
                  +{departureDates.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* CTA - more prominent */}
        <div className={compact ? "mt-4 space-y-2" : "mt-6 space-y-3"}>
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
          <WhatsAppShareButton href={shareUrl} className="block" />
        </div>
      </div>

      {/* Quick actions */}
      {showQuickActions && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-2 border-2"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: "Check out this trip on TravellersIn",
                  url: window.location.href,
                });
              } else {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
          >
            <Share2 className="size-4" />
            Share
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1 gap-2 border-2"
            onClick={() => {
              const el = document.getElementById("enquiry-section");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <MessageCircle className="size-4" />
            Ask
          </Button>
        </div>
      )}
    </div>
  );
}
