"use client";

import { Calendar, Users, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JoinTripButton } from "@/components/forms/join-trip-button";
import { WhatsAppShareButton } from "@/components/ui/whatsapp-share-button";
import { formatCurrency, formatDateRange } from "@/lib/format";
import type { GroupMember } from "@/lib/api/types";

interface BookingSidebarProps {
  groupId?: string;
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
}

export function BookingSidebar({
  groupId,
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
}: BookingSidebarProps) {
  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Price card */}
      <div className="rounded-[var(--radius-lg)] border border-white/70 bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-clay)] sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
          Starting from
        </p>
        <p className="mt-1 font-display text-2xl text-[var(--color-sea-700)] sm:text-3xl">
          {formatCurrency(price)}
          <span className="text-sm font-normal text-[var(--color-ink-500)] sm:text-base"> /person</span>
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">+ taxes as applicable</p>

        {/* Quick info */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2.5 text-xs text-[var(--color-ink-600)] sm:text-sm">
            <Calendar className="size-4 text-[var(--color-sea-600)]" />
            <span>{formatDateRange(startDate, endDate)}</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-[var(--color-ink-600)] sm:text-sm">
            <Users className="size-4 text-[var(--color-sea-600)]" />
            <span>
              {currentSize}/{groupSizeMax} joined
              {spotsLeft > 0 && spotsLeft <= 5 && (
                <span className="ml-1 font-semibold text-[var(--color-sunset-600)]">
                  · {spotsLeft} left!
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Departure dates */}
        {departureDates && departureDates.length > 1 && (
          <div className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] p-3 shadow-[var(--shadow-clay-inset)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
              Available batches
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {departureDates.slice(0, 4).map((date) => (
                <span
                  key={date}
                  className="rounded-full bg-[var(--color-sea-50)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]"
                >
                  {new Date(date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-5 space-y-2.5">
          <JoinTripButton
            groupId={groupId}
            label={label}
            requiresFemaleProfile={requiresFemaleProfile}
            members={members}
          />
          <WhatsAppShareButton href={shareUrl} className="block" />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 gap-1.5"
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
          <Share2 className="size-3.5" />
          Share
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => {
            const el = document.getElementById("enquiry-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <MessageCircle className="size-3.5" />
          Enquiry
        </Button>
      </div>
    </div>
  );
}
