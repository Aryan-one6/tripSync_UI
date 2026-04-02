"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Clock, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatCompactDate } from "@/lib/format";
import type { Offer } from "@/lib/api/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function offerStatusLabel(status: Offer["status"]) {
  const map: Record<Offer["status"], { label: string; color: string }> = {
    PENDING:  { label: "New Offer",  color: "bg-[var(--color-sea-50)] text-[var(--color-sea-700)] border-[var(--color-sea-200)]" },
    COUNTERED:{ label: "Counter",    color: "bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)] border-[var(--color-lavender-200)]" },
    ACCEPTED: { label: "Accepted",   color: "bg-[var(--color-sea-100)] text-[var(--color-sea-800)] border-[var(--color-sea-300)]" },
    REJECTED: { label: "Rejected",   color: "bg-[var(--color-sunset-50)] text-[var(--color-sunset-700)] border-[var(--color-sunset-200)]" },
    WITHDRAWN:{ label: "Withdrawn",  color: "bg-[var(--color-surface-2)] text-[var(--color-ink-500)] border-[var(--color-border)]" },
  };
  return map[status] ?? map.PENDING;
}

function ValidityCountdown({ validUntil }: { validUntil?: string | null }) {
  if (!validUntil) return null;
  const deadline = new Date(validUntil).getTime();
  const now = Date.now();
  const diffMs = deadline - now;
  if (diffMs <= 0) return <span className="text-xs text-[var(--color-sunset-600)]">Expired</span>;
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  return (
    <span className="flex items-center gap-1 text-xs text-[var(--color-ink-500)]">
      <Clock className="size-3.5" />
      {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`} left
    </span>
  );
}

// ─── Inclusions checklist ─────────────────────────────────────────────────────

const STANDARD_INCLUSIONS = [
  { key: "transport", label: "Transport" },
  { key: "hotel",     label: "Hotels" },
  { key: "meals",     label: "Meals" },
  { key: "guide",     label: "Guide" },
  { key: "visa",      label: "Visa" },
  { key: "insurance", label: "Insurance" },
];

function InclusionsList({ inclusions }: { inclusions?: Record<string, unknown> | null }) {
  if (!inclusions) return null;
  return (
    <div className="mt-3 grid grid-cols-3 gap-1.5">
      {STANDARD_INCLUSIONS.map(({ key, label }) => {
        const included = Boolean(inclusions[key]);
        return (
          <div
            key={key}
            className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-xs font-medium ${
              included
                ? "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-ink-400)] line-through"
            }`}
          >
            {included ? (
              <Check className="size-3 shrink-0 text-[var(--color-sea-500)]" />
            ) : (
              <X className="size-3 shrink-0 opacity-40" />
            )}
            {label}
          </div>
        );
      })}
    </div>
  );
}

// ─── Itinerary Preview ────────────────────────────────────────────────────────

function ItineraryPreview({ itinerary }: { itinerary?: Offer["itinerary"] }) {
  const [expanded, setExpanded] = useState(false);
  if (!itinerary || itinerary.length === 0) return null;
  const preview = expanded ? itinerary : itinerary.slice(0, 2);
  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
        Itinerary preview
      </p>
      {preview.map((item) => (
        <div key={item.day} className="flex gap-3 text-sm leading-snug">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-sea-100)] text-[10px] font-bold text-[var(--color-sea-700)]">
            {item.day}
          </span>
          <div>
            <p className="font-semibold text-[var(--color-ink-900)]">{item.title}</p>
            {item.description && (
              <p className="mt-0.5 text-xs text-[var(--color-ink-500)] line-clamp-1">{item.description}</p>
            )}
          </div>
        </div>
      ))}
      {itinerary.length > 2 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-1 rounded-[var(--radius-sm)] py-1.5 text-xs text-[var(--color-sea-600)] hover:bg-[var(--color-sea-50)] transition-colors"
        >
          {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          {expanded ? "Show less" : `+${itinerary.length - 2} more days`}
        </button>
      )}
    </div>
  );
}

// ─── Main Offer Card Component ────────────────────────────────────────────────

export interface OfferCardProps {
  offer: Offer;
  isCreator: boolean;
  isAgency?: boolean;
  onAccept?: (offerId: string) => void;
  onCounter?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  onWithdraw?: (offerId: string) => void;
}

export function OfferCard({ offer, isCreator, isAgency = false, onAccept, onCounter, onReject, onWithdraw }: OfferCardProps) {
  const statusInfo = offerStatusLabel(offer.status);
  const isTerminal = offer.status === "ACCEPTED" || offer.status === "REJECTED" || offer.status === "WITHDRAWN";

  const lastNeg = offer.negotiations?.[offer.negotiations.length - 1];
  const lastSender = lastNeg?.senderType;

  // Creator can act on PENDING offers, or on COUNTERED offers where the last counter was from the agency
  const creatorCanAct = isCreator && (offer.status === "PENDING" || (offer.status === "COUNTERED" && lastSender === "agency"));
  // Agency can act on COUNTERED offers where the last counter was from the creator (trip planner countered back)
  const agencyCanAct = isAgency && offer.status === "COUNTERED" && lastSender === "user";
  const negRoundsLeft = 3 - (offer.negotiations?.length ?? 0);

  return (
    <div
      className={`relative overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--color-surface-raised)] shadow-[var(--shadow-md)] transition-all duration-300 ${
        offer.status === "ACCEPTED"
          ? "border-[var(--color-sea-300)]"
          : offer.status === "REJECTED"
            ? "border-[var(--color-sunset-200)]"
            : "border-[var(--color-border)]"
      }`}
    >
      {/* Accepted glow */}
      {offer.status === "ACCEPTED" && (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-sea-50)] to-transparent pointer-events-none" />
      )}

      <div className="relative p-4 sm:p-5">
        {/* ── Top bar: agency info + status + timestamp ── */}
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div className="flex items-center gap-3">
            {/* Agency logo / initials */}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-sm font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]">
              {offer.agency.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={offer.agency.logoUrl} alt={offer.agency.name} className="size-full rounded-[inherit] object-cover" />
              ) : (
                offer.agency.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-semibold text-[var(--color-ink-900)] leading-tight">{offer.agency.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="size-3 fill-[var(--color-sunset-400)] text-[var(--color-sunset-500)]" />
                <span className="text-xs text-[var(--color-ink-500)]">
                  {offer.agency.avgRating.toFixed(1)}
                  {offer.agency.totalReviews ? ` (${offer.agency.totalReviews})` : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Status badge */}
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className="text-[10px] text-[var(--color-ink-400)]">
              {formatCompactDate(offer.createdAt)}
            </span>
          </div>
        </div>

        {/* ── Price (bold, text-2xl) ── */}
        <div className="mt-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-[var(--color-ink-950)]">
              {formatCurrency(offer.pricePerPerson)}
            </span>
            <span className="text-sm text-[var(--color-ink-500)]">/ person</span>
            <ValidityCountdown validUntil={offer.validUntil} />
          </div>

          {/* Tiered pricing */}
          {offer.pricingTiers && offer.pricingTiers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {offer.pricingTiers.map((tier) => (
                <span
                  key={tier.minPax}
                  className="rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-ink-600)]"
                >
                  {tier.minPax}+ pax → {formatCurrency(tier.price)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Inclusions checklist ── */}
        <InclusionsList inclusions={offer.inclusions} />

        {/* ── Itinerary preview ── */}
        <ItineraryPreview itinerary={offer.itinerary} />

        {/* ── Cancellation policy ── */}
        {offer.cancellationPolicy && (
          <p className="mt-3 text-xs text-[var(--color-ink-500)] leading-relaxed">
            <span className="font-semibold">Cancellation: </span>
            {offer.cancellationPolicy}
          </p>
        )}

        {/* ── Counter-offer history ── */}
        {offer.negotiations && offer.negotiations.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--color-ink-500)]">
              Negotiation history
            </p>
            {offer.negotiations.map((neg) => (
              <div
                key={neg.id}
                className={`flex items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-sm ${
                  neg.senderType === "agency"
                    ? "bg-[var(--color-sea-50)] text-[var(--color-sea-800)]"
                    : "bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)]"
                }`}
              >
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0">
                  {neg.senderType === "agency" ? "Agency" : "You"}
                </span>
                <div className="flex-1 min-w-0">
                  {neg.price && (
                    <span className="font-bold">{formatCurrency(neg.price)}/person </span>
                  )}
                  {neg.message && (
                    <span className="text-xs opacity-80">{neg.message}</span>
                  )}
                </div>
                <span className="shrink-0 text-[10px] opacity-60">{formatCompactDate(neg.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Creator action buttons (PENDING or COUNTERED where agency last replied) ── */}
        {creatorCanAct && !isTerminal && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4">
            <Button
              size="sm"
              variant="primary"
              onClick={() => onAccept?.(offer.id)}
              className="bg-[var(--color-sea-600)] flex-1 sm:flex-none"
            >
              <Check className="size-4" />
              Accept
            </Button>
            {negRoundsLeft > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onCounter?.(offer.id)}
                className="flex-1 sm:flex-none"
              >
                Counter {negRoundsLeft > 0 ? `(${negRoundsLeft} left)` : ""}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReject?.(offer.id)}
              className="flex-1 sm:flex-none text-[var(--color-sunset-600)] hover:bg-[var(--color-sunset-50)]"
            >
              <X className="size-4" />
              Decline
            </Button>
          </div>
        )}

        {/* ── Agency action buttons (COUNTERED where creator last replied) ── */}
        {agencyCanAct && !isTerminal && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-4">
            {negRoundsLeft > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onCounter?.(offer.id)}
                className="flex-1 sm:flex-none"
              >
                Counter Back {negRoundsLeft > 0 ? `(${negRoundsLeft} left)` : ""}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onWithdraw?.(offer.id)}
              className="flex-1 sm:flex-none text-[var(--color-ink-500)] hover:bg-[var(--color-surface-2)]"
            >
              Withdraw
            </Button>
          </div>
        )}

        {/* ── Terminal state banners ── */}
        {offer.status === "ACCEPTED" && (
          <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-sea-50)] border border-[var(--color-sea-200)] px-4 py-3 text-sm font-semibold text-[var(--color-sea-700)]">
            <Check className="size-4" />
            Offer accepted — payment step is next.
          </div>
        )}
        {offer.status === "REJECTED" && (
          <div className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] border border-[var(--color-sunset-200)] px-4 py-3 text-sm text-[var(--color-sunset-700)]">
            <X className="size-4" />
            This offer was declined.
          </div>
        )}
      </div>
    </div>
  );
}
