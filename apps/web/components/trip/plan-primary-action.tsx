"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Gavel, Inbox, Send } from "lucide-react";
import { JoinTripButton } from "@/components/forms/join-trip-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCurrency } from "@/lib/format";
import type { GroupMember, Offer } from "@/lib/api/types";

interface PlanPrimaryActionProps {
  groupId?: string;
  joinLabel?: string;
  requiresFemaleProfile?: boolean;
  members?: GroupMember[];
  planId?: string;
  planTitle?: string;
  destination?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  creatorUserId?: string;
  offers?: Offer[];
}

export function PlanPrimaryAction({
  groupId,
  joinLabel = "Join this trip",
  requiresFemaleProfile = false,
  members = [],
  planId,
  planTitle,
  destination,
  budgetMin,
  budgetMax,
  creatorUserId,
  offers = [],
}: PlanPrimaryActionProps) {
  const router = useRouter();
  const { session, apiFetchWithAuth } = useAuth();

  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [validHours, setValidHours] = useState("48");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [inclusions, setInclusions] = useState({
    transport: false,
    accommodation: false,
    meals: false,
    guide: false,
    visa: false,
    insurance: false,
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAgency = session?.role === "agency_admin";
  const agencyId = session?.agencyId ?? session?.user.agency?.id ?? null;

  const existingAgencyOffer = useMemo(() => {
    if (!isAgency || !agencyId) return null;
    return offers.find((offer) => offer.agency.id === agencyId) ?? null;
  }, [agencyId, isAgency, offers]);

  if (!isAgency) {
    return (
      <JoinTripButton
        groupId={groupId}
        label={joinLabel}
        requiresFemaleProfile={requiresFemaleProfile}
        members={members}
      />
    );
  }

  const inboxHref = creatorUserId ? `/agency/inbox?userId=${creatorUserId}` : "/agency/inbox";

  const canNegotiateFromInbox =
    existingAgencyOffer &&
    (existingAgencyOffer.status === "PENDING" || existingAgencyOffer.status === "COUNTERED");

  function resetModal() {
    setPrice("");
    setValidHours("48");
    setCancellationPolicy("");
    setInclusions({
      transport: false,
      accommodation: false,
      meals: false,
      guide: false,
      visa: false,
      insurance: false,
    });
  }

  function submitOffer() {
    if (!price || !planId) return;

    startTransition(async () => {
      try {
        setFeedback(null);

        const validUntil = new Date(Date.now() + Number(validHours) * 3_600_000).toISOString();

        await apiFetchWithAuth<Offer>("/offers", {
          method: "POST",
          body: JSON.stringify({
            planId,
            pricePerPerson: Number(price),
            validUntil,
            cancellationPolicy: cancellationPolicy.trim() || undefined,
            inclusions: {
              transport: inclusions.transport || undefined,
              hotel: inclusions.accommodation || undefined,
              accommodation: inclusions.accommodation || undefined,
              meals: inclusions.meals ? "included" : undefined,
              guide: inclusions.guide || undefined,
              visa: inclusions.visa || undefined,
              insurance: inclusions.insurance || undefined,
            },
          }),
        });

        setOpen(false);
        resetModal();
        router.push(inboxHref);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to submit offer right now.");
      }
    });
  }

  if (existingAgencyOffer) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-[var(--color-ink-600)]">
          You already sent an offer on this plan ({existingAgencyOffer.status.toLowerCase()}).
        </p>
        <Link href={inboxHref} className="block">
          <Button type="button" className="w-full gap-2">
            <Inbox className="size-4" />
            {canNegotiateFromInbox ? "Open Inbox for Counter" : "Open Inbox"}
          </Button>
        </Link>
        <Link href={planId ? `/agency/bids?planId=${planId}` : "/agency/bids"} className="block">
          <Button type="button" variant="secondary" className="w-full gap-2">
            <Gavel className="size-4" />
            Open Bid Manager
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {planId ? (
          <Button type="button" className="w-full gap-2" onClick={() => setOpen(true)}>
            <Send className="size-4" />
            Send Offer as Agency
          </Button>
        ) : (
          <Button type="button" className="w-full gap-2" disabled>
            <Send className="size-4" />
            Offer unavailable here
          </Button>
        )}
        <Link href="/agency/bids" className="block">
          <Button type="button" variant="secondary" className="w-full gap-2">
            <Gavel className="size-4" />
            Browse Open Trips
          </Button>
        </Link>
        {feedback && (
          <p className="text-xs text-[var(--color-sunset-700)]">{feedback}</p>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Send agency offer"
        description={planTitle && destination ? `${planTitle} · ${destination}` : "Submit your price for this trip"}
      >
        <div className="space-y-4">
          {(budgetMin || budgetMax) && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-3 text-sm text-[var(--color-ink-600)]">
              Traveler budget: <strong>{formatCurrency(budgetMin)} – {formatCurrency(budgetMax)}</strong>
            </div>
          )}

          {feedback && (
            <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)]">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
              Price per person (₹)
            </label>
            <Input
              type="number"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              min={0}
              placeholder="e.g. 18000"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
              Offer valid for (hours)
            </label>
            <Input
              type="number"
              value={validHours}
              onChange={(event) => setValidHours(event.target.value)}
              min={1}
              max={168}
              placeholder="48"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
              Inclusions
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                ["transport", "Transport"],
                ["accommodation", "Hotels"],
                ["meals", "Meals"],
                ["guide", "Guide"],
                ["visa", "Visa"],
                ["insurance", "Insurance"],
              ].map(([key, label]) => {
                const typedKey = key as keyof typeof inclusions;
                const active = inclusions[typedKey];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setInclusions((current) => ({ ...current, [typedKey]: !current[typedKey] }))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-[var(--color-sea-300)] bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink-600)]"
                    }`}
                  >
                    {active ? "✓ " : ""}
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
              Cancellation policy <span className="font-normal text-[var(--color-ink-400)]">(optional)</span>
            </label>
            <Textarea
              value={cancellationPolicy}
              onChange={(event) => setCancellationPolicy(event.target.value)}
              rows={2}
              placeholder="e.g. Full refund up to 7 days before departure"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={submitOffer} disabled={isPending || !price}>
              {isPending ? "Sending…" : "Send Offer"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
