"use client";

import { Check, Clock3, Star } from "lucide-react";
import { formatCompactDate, formatCurrency } from "@/lib/format";
import type { Offer } from "@/lib/api/types";

function offerStatusLabel(status: Offer["status"]) {
  const map: Record<Offer["status"], { label: string; tone: string }> = {
    PENDING: {
      label: "New",
      tone: "bg-[var(--color-sea-50)] text-[var(--color-sea-700)] border-[var(--color-sea-200)]",
    },
    COUNTERED: {
      label: "Counter",
      tone: "bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)] border-[var(--color-lavender-200)]",
    },
    ACCEPTED: {
      label: "Accepted",
      tone: "bg-[var(--color-sea-100)] text-[var(--color-sea-800)] border-[var(--color-sea-300)]",
    },
    REJECTED: {
      label: "Declined",
      tone: "bg-[var(--color-sunset-50)] text-[var(--color-sunset-700)] border-[var(--color-sunset-200)]",
    },
    WITHDRAWN: {
      label: "Withdrawn",
      tone: "bg-[var(--color-surface-2)] text-[var(--color-ink-500)] border-[var(--color-border)]",
    },
  };

  return map[status] ?? map.PENDING;
}

function getValidityText(validUntil?: string | null) {
  if (!validUntil) return null;

  const deadline = new Date(validUntil).getTime();
  const now = Date.now();
  const diffMs = deadline - now;

  if (diffMs <= 0) return "Expired";

  const hours = Math.floor(diffMs / 3_600_000);
  if (hours >= 1) return `Expires in ${hours}h`;

  const mins = Math.max(1, Math.floor(diffMs / 60_000));
  return `Expires in ${mins}m`;
}

function inclusionLabels(inclusions?: Record<string, unknown> | null) {
  if (!inclusions) return [] as string[];

  const labels: string[] = [];
  if (Boolean(inclusions.transport)) labels.push("Transport");
  if (Boolean(inclusions.hotel ?? inclusions.accommodation)) labels.push("Hotels");
  if (Boolean(inclusions.meals)) labels.push("Meals");
  if (Boolean(inclusions.guide)) labels.push("Guide");
  if (Boolean(inclusions.visa)) labels.push("Visa");
  if (Boolean(inclusions.insurance)) labels.push("Insurance");

  return labels;
}

export interface OfferCardProps {
  offer: Offer;
  isCreator: boolean;
  isAgency?: boolean;
  onAccept?: (offerId: string) => void;
  onCounter?: (offerId: string) => void;
  onReject?: (offerId: string) => void;
  onWithdraw?: (offerId: string) => void;
}

export function OfferCard({
  offer,
  isCreator,
  isAgency = false,
  onAccept,
  onCounter,
  onReject,
  onWithdraw,
}: OfferCardProps) {
  const statusInfo = offerStatusLabel(offer.status);
  const isTerminal =
    offer.status === "ACCEPTED" || offer.status === "REJECTED" || offer.status === "WITHDRAWN";

  const lastNeg = offer.negotiations?.[offer.negotiations.length - 1];
  const lastSender = lastNeg?.senderType;

  const creatorCanAct =
    isCreator &&
    (offer.status === "PENDING" || (offer.status === "COUNTERED" && lastSender === "agency"));
  const agencyCanAct = isAgency && offer.status === "COUNTERED" && lastSender === "user";

  const roundsUsed = offer.negotiations?.length ?? 0;
  const roundsLeft = Math.max(0, 3 - roundsUsed);

  const includes = inclusionLabels(offer.inclusions);
  const validityText = getValidityText(offer.validUntil);
  const itineraryDays = offer.itinerary?.length ?? 0;

  return (
    <article className="overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-sea-100)] bg-[var(--color-sea-50)] px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-sea-800)]">
            {offer.agency.name}
            <span className="ml-2 inline-flex items-center gap-1 text-[var(--color-sea-700)]">
              <Star className="size-3.5 fill-current" />
              {offer.agency.avgRating.toFixed(1)}
            </span>
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusInfo.tone}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="space-y-3.5 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-wrap items-baseline gap-2">
          <p className="font-display text-4xl leading-none text-[var(--color-ink-950)] sm:text-5xl">
            {formatCurrency(offer.pricePerPerson)}
          </p>
          <p className="text-2xl font-semibold text-[var(--color-ink-900)] sm:text-3xl">/ person</p>
        </div>

        {includes.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-sea-800)]">
            {includes.slice(0, 6).map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--color-sea-700)]" />
                {item}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-500)]">
          <span>{itineraryDays > 0 ? `${itineraryDays}-day itinerary shared` : "Custom itinerary available"}</span>
          {validityText && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3.5" />
                {validityText}
              </span>
            </>
          )}
          <span>•</span>
          <span>{formatCompactDate(offer.createdAt)}</span>
        </div>

        {offer.negotiations && offer.negotiations.length > 0 && (
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
              Last counter
            </p>
            <p className="text-xs text-[var(--color-ink-700)]">
              {lastNeg?.senderType === "agency" ? "Agency" : "Creator"}
              {lastNeg?.price ? `: ${formatCurrency(lastNeg.price)}/person` : " updated terms"}
              {lastNeg?.message ? ` — ${lastNeg.message}` : ""}
            </p>
          </div>
        )}

        {creatorCanAct && !isTerminal && (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onAccept?.(offer.id)}
              className="rounded-[10px] bg-[var(--color-sea-700)] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-sea-800)]"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => onCounter?.(offer.id)}
              disabled={roundsLeft === 0}
              className="rounded-[10px] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm font-semibold text-[var(--color-ink-700)] transition hover:bg-[var(--color-line)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Counter{roundsLeft > 0 ? ` (${roundsLeft})` : ""}
            </button>
            <button
              type="button"
              onClick={() => onReject?.(offer.id)}
              className="rounded-[10px] bg-[var(--color-sunset-50)] px-3 py-2.5 text-sm font-semibold text-[var(--color-sunset-700)] transition hover:bg-[var(--color-sunset-100)]"
            >
              Decline
            </button>
          </div>
        )}

        {agencyCanAct && !isTerminal && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onCounter?.(offer.id)}
              disabled={roundsLeft === 0}
              className="rounded-[10px] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm font-semibold text-[var(--color-ink-700)] transition hover:bg-[var(--color-line)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Counter Back{roundsLeft > 0 ? ` (${roundsLeft})` : ""}
            </button>
            <button
              type="button"
              onClick={() => onWithdraw?.(offer.id)}
              className="rounded-[10px] bg-[var(--color-sunset-50)] px-3 py-2.5 text-sm font-semibold text-[var(--color-sunset-700)] transition hover:bg-[var(--color-sunset-100)]"
            >
              Withdraw
            </button>
          </div>
        )}

        {offer.status === "ACCEPTED" && (
          <div className="rounded-[12px] border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] px-3 py-2 text-sm font-semibold text-[var(--color-sea-700)]">
            Offer accepted. Move to payment and group confirmation.
          </div>
        )}

        {offer.status === "REJECTED" && (
          <div className="rounded-[12px] border border-[var(--color-sunset-200)] bg-[var(--color-sunset-50)] px-3 py-2 text-sm text-[var(--color-sunset-700)]">
            This offer was declined.
          </div>
        )}
      </div>
    </article>
  );
}
