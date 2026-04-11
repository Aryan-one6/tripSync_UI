"use client";

import { Check, Clock3, Star } from "lucide-react";
import { formatCompactDate, formatCurrency } from "@/lib/format";
import type { Offer } from "@/lib/api/types";

function offerStatusLabel(status: Offer["status"]) {
  const map: Record<Offer["status"], { label: string; tone: string }> = {
    PENDING: {
      label: "PENDING",
      tone: "bg-[var(--color-sea-50)] text-[var(--color-sea-700)] border-[var(--color-sea-200)]",
    },
    COUNTERED: {
      label: "COUNTERED",
      tone: "bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)] border-[var(--color-lavender-200)]",
    },
    ACCEPTED: {
      label: "ACCEPTED",
      tone: "bg-[var(--color-sea-100)] text-[var(--color-sea-800)] border-[var(--color-sea-300)]",
    },
    REJECTED: {
      label: "REJECTED",
      tone: "bg-[var(--color-sunset-50)] text-[var(--color-sunset-700)] border-[var(--color-sunset-200)]",
    },
    WITHDRAWN: {
      label: "WITHDRAWN",
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

function inclusionCoverage(inclusions?: Record<string, unknown> | null) {
  const data = inclusions ?? {};
  return [
    { label: "Transport", included: Boolean(data.transport) },
    { label: "Hotels", included: Boolean(data.hotel ?? data.accommodation) },
    { label: "Meals", included: Boolean(data.meals) },
    { label: "Guide", included: Boolean(data.guide) },
    { label: "Visa", included: Boolean(data.visa) },
    { label: "Insurance", included: Boolean(data.insurance) },
  ];
}

export interface OfferCardProps {
  offer: Offer;
  isCreator: boolean;
  isAgency?: boolean;
  compact?: boolean;
  onAccept?: (offerId: string) => void;
  onCounter?: (offerId: string, seedPrice?: number) => void;
  onReject?: (offerId: string) => void;
  onWithdraw?: (offerId: string) => void;
}

export function OfferCard({
  offer,
  isCreator,
  isAgency = false,
  compact = false,
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

  const creatorCanCounter =
    isCreator &&
    (offer.status === "PENDING" || (offer.status === "COUNTERED" && lastSender === "agency"));
  const creatorCanAccept =
    isCreator && (offer.status === "PENDING" || offer.status === "COUNTERED");
  const agencyCanAct = isAgency && offer.status === "COUNTERED" && lastSender === "user";

  const roundsUsed = offer.negotiations?.length ?? 0;
  const roundsLeft = Math.max(0, 3 - roundsUsed);

  const includes = inclusionLabels(offer.inclusions);
  const inclusionRows = inclusionCoverage(offer.inclusions);
  const activities =
    offer.inclusions && Array.isArray(offer.inclusions.activities)
      ? offer.inclusions.activities
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  const validityText = getValidityText(offer.validUntil);
  const itineraryDays = offer.itinerary?.length ?? 0;
  const canReuseQuoteAsCounter = !isTerminal && roundsLeft > 0 && (creatorCanCounter || agencyCanAct);
  const agencyName = offer.agency?.name ?? "Agency";
  const agencyRating = Number.isFinite(offer.agency?.avgRating)
    ? Number(offer.agency.avgRating).toFixed(1)
    : "0.0";

  const timelineRows = [
    {
      id: `live-${offer.id}`,
      label: "Live quote",
      senderType:
        offer.status === "COUNTERED" && lastSender === "user"
          ? ("user" as const)
          : ("agency" as const),
      price: offer.pricePerPerson,
      message: null,
      createdAt: offer.updatedAt,
      isLive: true,
      round: null as number | null,
    },
    ...(offer.negotiations ?? [])
      .filter((entry) => typeof entry.price === "number")
      .map((entry) => ({
        id: entry.id,
        label: `Round ${entry.round}`,
        senderType: entry.senderType,
        price: Number(entry.price),
        message: entry.message ?? null,
        createdAt: entry.createdAt,
        isLive: false,
        round: entry.round,
      })),
  ];

  const seenTimelineKeys = new Set<string>();
  const quoteTimeline = timelineRows
    .filter((row) => {
      const key = `${row.isLive ? "live" : "round"}:${row.senderType}:${row.round ?? "na"}:${row.price}:${row.message ?? ""}:${row.createdAt}`;
      if (seenTimelineKeys.has(key)) return false;
      seenTimelineKeys.add(key);
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestAgencyNote =
    quoteTimeline.find((quote) => quote.senderType === "agency" && quote.message)?.message ?? null;
  const canReconfirmOldAgencyQuote =
    isCreator &&
    creatorCanCounter &&
    quoteTimeline.some((quote) => !quote.isLive && quote.senderType === "agency");

  if (compact) {
    return (
      <article className="overflow-hidden rounded-[16px] bg-[var(--color-surface-raised)]">
        {/* ── Header band ── */}
        <div className="flex items-start justify-between gap-2 border-b border-[var(--color-sea-100)] bg-[var(--color-sea-50)] px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-[var(--color-sea-800)]">
              {agencyName}
              <span className="ml-1.5 inline-flex items-center gap-0.5 font-semibold text-[var(--color-sea-700)]">
                <Star className="size-3 fill-current" />
                {agencyRating}
              </span>
            </p>
            {offer.plan?.title && (
              <p className="truncate text-[10px] text-[var(--color-ink-500)]">{offer.plan.title}</p>
            )}
          </div>
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${statusInfo.tone}`}>
            {statusInfo.label}
          </span>
        </div>

        {/* ── Price block ── */}
        <div className="px-3.5 pb-0 pt-3">
          <div className="flex items-baseline gap-1.5">
            <p className="font-display text-[1.65rem] font-extrabold leading-none text-[var(--color-ink-950)]">
              {formatCurrency(offer.pricePerPerson)}
            </p>
            <p className="text-sm font-semibold text-[var(--color-ink-500)]">⁄ person</p>
          </div>

          {/* Inclusions */}
          {includes.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {includes.slice(0, 6).map((item) => (
                <span key={item} className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-sea-700)]">
                  <Check className="size-3 shrink-0" />
                  {item}
                </span>
              ))}
            </div>
          )}

          {/* Meta row */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[var(--color-ink-400)]">
            {offer.plan?.destination && <span>{offer.plan.destination}</span>}
            {validityText && (
              <>
                {offer.plan?.destination && <span>·</span>}
                <span className="inline-flex items-center gap-0.5">
                  <Clock3 className="size-3" />
                  {validityText}
                </span>
              </>
            )}
            {roundsUsed > 0 && (
              <>
                <span>·</span>
                <span>Round {Math.min(roundsUsed + 1, 3)}/3</span>
              </>
            )}
          </div>

          {/* Agency note */}
          {latestAgencyNote && (
            <p className="mt-2 rounded-[8px] bg-[var(--color-surface-2)] px-2.5 py-1.5 text-[11px] text-[var(--color-ink-600)]">
              <span className="font-semibold text-[var(--color-ink-700)]">Note: </span>
              {latestAgencyNote}
            </p>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="px-3.5 pb-3.5 pt-3">
          {creatorCanAccept && !isTerminal && (
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onAccept?.(offer.id)}
                className="rounded-[8px] bg-[var(--color-sea-700)] py-2 text-xs font-bold text-white transition hover:bg-[var(--color-sea-800)] active:scale-[0.97]"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => onCounter?.(offer.id)}
                disabled={!creatorCanCounter || roundsLeft === 0}
                className="rounded-[8px] bg-[var(--color-surface-2)] py-2 text-xs font-semibold text-[var(--color-ink-700)] transition hover:bg-[var(--color-line)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creatorCanCounter ? "Counter" : "Await"}
              </button>
              <button
                type="button"
                onClick={() => onReject?.(offer.id)}
                className="rounded-[8px] bg-[var(--color-sunset-50)] py-2 text-xs font-semibold text-[var(--color-sunset-700)] transition hover:bg-[var(--color-sunset-100)] active:scale-[0.97]"
              >
                Decline
              </button>
            </div>
          )}

          {agencyCanAct && !isTerminal && (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => onCounter?.(offer.id)}
                disabled={roundsLeft === 0}
                className="rounded-[8px] bg-[var(--color-surface-2)] py-2 text-xs font-semibold text-[var(--color-ink-700)] transition hover:bg-[var(--color-line)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Counter{roundsLeft > 0 ? ` (${roundsLeft})` : ""}
              </button>
              <button
                type="button"
                onClick={() => onWithdraw?.(offer.id)}
                className="rounded-[8px] bg-[var(--color-sunset-50)] py-2 text-xs font-semibold text-[var(--color-sunset-700)] transition hover:bg-[var(--color-sunset-100)] active:scale-[0.97]"
              >
                Withdraw
              </button>
            </div>
          )}

          {offer.status === "ACCEPTED" && (
            <div className="rounded-[8px] border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] px-2.5 py-2 text-xs font-semibold text-[var(--color-sea-700)]">
              ✓ Offer accepted — proceed to payment
            </div>
          )}

          {offer.status === "REJECTED" && (
            <div className="rounded-[8px] border border-[var(--color-sunset-200)] bg-[var(--color-sunset-50)] px-2.5 py-2 text-xs text-[var(--color-sunset-700)]">
              This offer was declined.
            </div>
          )}

          {offer.status === "WITHDRAWN" && (
            <div className="rounded-[8px] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-2 text-xs text-[var(--color-ink-500)]">
              Offer withdrawn by agency.
            </div>
          )}
        </div>
      </article>
    );
  }

  return (

    <article className="overflow-hidden rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-sea-100)] bg-[var(--color-sea-50)] px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-sea-800)]">
            {agencyName}
            <span className="ml-2 inline-flex items-center gap-1 text-[var(--color-sea-700)]">
              <Star className="size-3.5 fill-current" />
              {agencyRating}
            </span>
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${statusInfo.tone}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="space-y-3.5 px-4 py-4 sm:px-5 sm:py-5">
        {offer.plan && (
          <div className="rounded-[10px] bg-[var(--color-surface-2)] px-3 py-2">
            <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
              {offer.plan.title}
            </p>
            <p className="truncate text-xs text-[var(--color-ink-500)]">{offer.plan.destination}</p>
          </div>
        )}

        <div className="flex flex-wrap items-baseline gap-2">
          <p className="font-display text-4xl leading-none text-[var(--color-ink-950)] sm:text-5xl">
            {formatCurrency(offer.pricePerPerson)}
          </p>
          <p className="text-2xl font-semibold text-[var(--color-ink-900)] sm:text-3xl">/ person</p>
        </div>

        {offer.pricingTiers && offer.pricingTiers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {offer.pricingTiers.map((tier) => (
              <span
                key={tier.minPax}
                className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] text-[var(--color-ink-600)]"
              >
                {tier.minPax}+ pax: {formatCurrency(tier.price)}
              </span>
            ))}
          </div>
        )}

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

        <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
            What this offer includes
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {inclusionRows.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between gap-2 rounded-[8px] bg-[var(--color-surface-raised)] px-2 py-1.5">
                <span className="text-[var(--color-ink-700)]">{entry.label}</span>
                <span className={entry.included ? "font-semibold text-[var(--color-sea-700)]" : "text-[var(--color-ink-500)]"}>
                  {entry.included ? "Included" : "Not specified"}
                </span>
              </div>
            ))}
          </div>
          {activities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activities.slice(0, 6).map((activity) => (
                <span
                  key={activity}
                  className="rounded-full bg-[var(--color-lavender-50)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-lavender-500)]"
                >
                  {activity}
                </span>
              ))}
            </div>
          )}
          {latestAgencyNote && (
            <p className="mt-2 text-xs text-[var(--color-ink-600)]">
              <span className="font-semibold text-[var(--color-ink-700)]">Latest agency note:</span>{" "}
              {latestAgencyNote}
            </p>
          )}
        </div>

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

        {quoteTimeline.length > 0 && (
          <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2.5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-500)]">
              Offer & counter timeline
            </p>
            <div className="space-y-2">
              {quoteTimeline.map((quote) => (
                <div
                  key={quote.id}
                  className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2.5 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-[var(--color-ink-700)]">
                      {quote.label} · {quote.senderType === "agency" ? "Agency" : "Creator"}
                    </p>
                    <p className="text-xs font-semibold text-[var(--color-ink-900)]">
                      {formatCurrency(quote.price)} / person
                    </p>
                  </div>
                  {quote.message && (
                    <p className="mt-1 text-xs text-[var(--color-ink-600)]">{quote.message}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--color-ink-500)]">
                    <span>{formatCompactDate(quote.createdAt)}</span>
                    {quote.isLive && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-[var(--color-sea-700)]">Current</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {canReuseQuoteAsCounter && !quote.isLive && (
                      <button
                        type="button"
                        onClick={() => onCounter?.(offer.id, quote.price)}
                        className="rounded-full border border-[var(--color-lavender-200)] bg-[var(--color-lavender-50)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-lavender-500)] transition hover:bg-[var(--color-lavender-100)]"
                      >
                        {isCreator && quote.senderType === "agency"
                          ? "Reconfirm quote"
                          : "Re-use in counter"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {canReconfirmOldAgencyQuote && (
              <p className="mt-2 text-[11px] text-[var(--color-ink-600)]">
                To accept an older agency quote: click <strong>Reconfirm quote</strong>, send that
                counter, then accept the new current quote.
              </p>
            )}
          </div>
        )}

        {offer.cancellationPolicy && (
          <p className="text-xs text-[var(--color-ink-500)]">
            <span className="font-semibold text-[var(--color-ink-700)]">Cancellation:</span>{" "}
            {offer.cancellationPolicy}
          </p>
        )}

        {creatorCanAccept && !isTerminal && (
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
              disabled={!creatorCanCounter || roundsLeft === 0}
              className="rounded-[10px] bg-[var(--color-surface-2)] px-3 py-2.5 text-sm font-semibold text-[var(--color-ink-700)] transition hover:bg-[var(--color-line)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatorCanCounter ? `Counter${roundsLeft > 0 ? ` (${roundsLeft})` : ""}` : "Await agency"}
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
