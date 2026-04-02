"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Gavel,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { OfferCard } from "@/components/chat/offer-card";
import {
  CounterOfferSheet,
  type CounterOfferPayload,
} from "@/components/chat/counter-offer-sheet";
import { useAuth } from "@/lib/auth/auth-context";
import { useSocket } from "@/lib/realtime/use-socket";
import { formatCurrency, formatDateRange } from "@/lib/format";
import type { DiscoverItem, Offer } from "@/lib/api/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function upsertOffer(list: Offer[], next: Offer) {
  const idx = list.findIndex((o) => o.id === next.id);
  if (idx === -1) return [next, ...list];
  const clone = [...list];
  clone[idx] = next;
  return clone;
}

// ── Submit Offer Modal ────────────────────────────────────────────────────────

function SubmitOfferModal({
  plan,
  onClose,
  onSubmitted,
  apiFetchWithAuth,
}: {
  plan: DiscoverItem | null;
  onClose: () => void;
  onSubmitted: (offer: Offer) => void;
  apiFetchWithAuth: <T>(url: string, options?: RequestInit) => Promise<T>;
}) {
  const [price, setPrice] = useState("");
  const [validHours, setValidHours] = useState("48");
  const [message, setMessage] = useState("");
  const [cancellationPolicy, setCancellationPolicy] = useState("");
  const [inclInclusions, setInclInclusions] = useState({
    transport: false,
    accommodation: false,
    meals: false,
    guide: false,
    visa: false,
    insurance: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setPrice("");
    setValidHours("48");
    setMessage("");
    setCancellationPolicy("");
    setInclInclusions({
      transport: false,
      accommodation: false,
      meals: false,
      guide: false,
      visa: false,
      insurance: false,
    });
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const INCL_KEYS: Array<{ key: keyof typeof inclInclusions; label: string }> = [
    { key: "transport", label: "Transport" },
    { key: "accommodation", label: "Hotels" },
    { key: "meals", label: "Meals" },
    { key: "guide", label: "Guide" },
    { key: "visa", label: "Visa" },
    { key: "insurance", label: "Insurance" },
  ];

  function submit() {
    if (!plan || !price) return;
    startTransition(async () => {
      try {
        setError(null);
        const validUntil = new Date(
          Date.now() + Number(validHours) * 3_600_000,
        ).toISOString();
        const offer = await apiFetchWithAuth<Offer>("/offers", {
          method: "POST",
          body: JSON.stringify({
            planId: plan.id,
            pricePerPerson: Number(price),
            validUntil,
            cancellationPolicy: cancellationPolicy.trim() || undefined,
            inclusions: {
              transport: inclInclusions.transport || undefined,
              accommodation: inclInclusions.accommodation || undefined,
              meals: inclInclusions.meals ? "included" : undefined,
            },
          }),
        });
        onSubmitted(offer);
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit offer.");
      }
    });
  }

  return (
    <Modal
      open={Boolean(plan)}
      onClose={handleClose}
      title="Submit an Offer"
      description={
        plan
          ? `${plan.title} · ${plan.destination} · ${formatDateRange(plan.startDate, plan.endDate)}`
          : ""
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Budget hint */}
        {(plan?.priceLow || plan?.priceHigh) && (
          <CardInset className="p-3 text-sm text-[var(--color-ink-600)]">
            Traveler budget:{" "}
            <strong>
              {formatCurrency(plan.priceLow)} – {formatCurrency(plan.priceHigh)}
            </strong>
          </CardInset>
        )}

        {/* Price */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
            Price per person (₹)
          </label>
          <Input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 12000"
            min={0}
          />
        </div>

        {/* Offer validity */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
            Offer valid for (hours)
          </label>
          <Input
            type="number"
            value={validHours}
            onChange={(e) => setValidHours(e.target.value)}
            placeholder="48"
            min={1}
            max={168}
          />
        </div>

        {/* Inclusions */}
        <div>
          <p className="mb-2 text-sm font-medium text-[var(--color-ink-700)]">What&apos;s included</p>
          <div className="flex flex-wrap gap-2">
            {INCL_KEYS.map(({ key, label }) => {
              const active = inclInclusions[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setInclInclusions((cur) => ({ ...cur, [key]: !cur[key] }))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "border-[var(--color-sea-300)] bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink-600)] hover:border-[var(--color-sea-200)]"
                  }`}
                >
                  {active ? "✓ " : ""}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cancellation policy */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
            Cancellation policy{" "}
            <span className="font-normal text-[var(--color-ink-400)]">(optional)</span>
          </label>
          <Textarea
            value={cancellationPolicy}
            onChange={(e) => setCancellationPolicy(e.target.value)}
            rows={2}
            placeholder="e.g. Full refund up to 7 days before departure"
          />
        </div>

        {/* Message */}
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
            Message to traveler{" "}
            <span className="font-normal text-[var(--color-ink-400)]">(optional)</span>
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="We cover all transport from Delhi, premium hotels, and a certified guide…"
          />
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !price}>
            {isPending ? "Submitting…" : `Submit at ${price ? `₹${Number(price).toLocaleString("en-IN")}` : "…"}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Plan card for the browse section ─────────────────────────────────────────

function PlanCard({
  plan,
  alreadyBid,
  onSelect,
}: {
  plan: DiscoverItem;
  alreadyBid: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-sm)]">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--color-ink-900)]">{plan.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-500)]">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {plan.destination}
          </span>
          <span>·</span>
          <span>{formatDateRange(plan.startDate, plan.endDate)}</span>
          {(plan.priceLow || plan.priceHigh) && (
            <>
              <span>·</span>
              <span className="text-[var(--color-sea-700)]">
                Budget: {formatCurrency(plan.priceLow)} – {formatCurrency(plan.priceHigh)}
              </span>
            </>
          )}
          <span>·</span>
          <span>
            {plan.groupSizeMin}–{plan.groupSizeMax} travelers
          </span>
        </div>
      </div>
      {alreadyBid ? (
        <span className="shrink-0 rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-xs font-semibold text-[var(--color-sea-700)]">
          Bid sent
        </span>
      ) : (
        <Button size="sm" onClick={onSelect}>
          Bid
        </Button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgencyBidsPage() {
  const searchParams = useSearchParams();
  const { apiFetchWithAuth } = useAuth();
  const socket = useSocket();
  const preselectedPlanId = searchParams.get("planId");

  const [offers, setOffers] = useState<Offer[]>([]);
  const [openPlans, setOpenPlans] = useState<DiscoverItem[]>([]);
  const [planSearch, setPlanSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [submitForPlan, setSubmitForPlan] = useState<DiscoverItem | null>(null);
  const [counterSheetOfferId, setCounterSheetOfferId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Load offers ─────────────────────────────────────────────────────────────
  async function loadOffers() {
    try {
      const data = await apiFetchWithAuth<Offer[]>("/offers/my");
      setOffers(data);
      setFeedback(null);
    } catch (err) {
      setFeedback(
        err instanceof Error ? err.message : "Unable to load your offers right now.",
      );
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load open plans when browse panel opens ──────────────────────────────────
  useEffect(() => {
    if ((!showBrowse && !preselectedPlanId) || openPlans.length > 0) return;
    void (async () => {
      try {
        setLoadingPlans(true);
        const data = await apiFetchWithAuth<DiscoverItem[]>("/discover");
        setOpenPlans(data.filter((p) => p.originType === "plan" && p.status === "OPEN"));
      } catch {
        setOpenPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    })();
  }, [showBrowse, preselectedPlanId, openPlans.length, apiFetchWithAuth]);

  useEffect(() => {
    if (!preselectedPlanId || submitForPlan) return;
    const matched = openPlans.find((plan) => plan.id === preselectedPlanId);
    if (matched) {
      setSubmitForPlan(matched);
      setShowBrowse(false);
      return;
    }

    const alreadyBid = offers.some((offer) => offer.planId === preselectedPlanId);
    if (alreadyBid) {
      setFeedback("You already have an offer on this plan. Open it below to counter or update.");
    }
  }, [preselectedPlanId, openPlans, offers, submitForPlan]);

  // ── Socket: real-time offer updates ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const refreshFromServer = async () => {
      const data = await apiFetchWithAuth<Offer[]>("/offers/my").catch(
        () => [] as Offer[],
      );
      setOffers(data);
    };

    socket.on("offer:countered", refreshFromServer);
    socket.on("offer:accepted", refreshFromServer);
    socket.on("offer:rejected", refreshFromServer);
    socket.on("offer:updated", refreshFromServer);

    return () => {
      socket.off("offer:countered", refreshFromServer);
      socket.off("offer:accepted", refreshFromServer);
      socket.off("offer:rejected", refreshFromServer);
      socket.off("offer:updated", refreshFromServer);
    };
  }, [apiFetchWithAuth, socket]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function handleCounter(offerId: string, payload: CounterOfferPayload) {
    try {
      setFeedback(null);
      // Counter endpoint returns the negotiation record, not the full Offer.
      // Reload the full offers list for accurate state.
      await apiFetchWithAuth(`/offers/${offerId}/counter`, {
        method: "POST",
        body: JSON.stringify({
          price: payload.price,
          message: payload.message || undefined,
          inclusionsDelta: payload.requestedAdditions.length
            ? { requestedAdditions: payload.requestedAdditions }
            : undefined,
        }),
      });
      const data = await apiFetchWithAuth<Offer[]>("/offers/my");
      setOffers(data);
      setCounterSheetOfferId(null);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to submit counter.");
    }
  }

  async function handleWithdraw(offerId: string) {
    if (!confirm("Withdraw this offer? This cannot be undone.")) return;
    try {
      setFeedback(null);
      const updated = await apiFetchWithAuth<Offer>(`/offers/${offerId}/withdraw`, {
        method: "POST",
      });
      setOffers((cur) => upsertOffer(cur, updated));
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Failed to withdraw offer.");
    }
  }

  async function handleManualRefresh() {
    try {
      setRefreshing(true);
      const data = await apiFetchWithAuth<Offer[]>("/offers/my");
      setOffers(data);
    } finally {
      setRefreshing(false);
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const counteringOffer = counterSheetOfferId
    ? offers.find((o) => o.id === counterSheetOfferId)
    : null;

  const needsActionOffers = offers.filter(
    (o) =>
      o.status === "COUNTERED" &&
      o.negotiations?.length > 0 &&
      o.negotiations[o.negotiations.length - 1]?.senderType === "user",
  );

  const activeOffers = offers.filter(
    (o) => o.status === "PENDING" || o.status === "COUNTERED",
  );
  const acceptedOffers = offers.filter((o) => o.status === "ACCEPTED");
  const closedOffers = offers.filter(
    (o) => o.status === "REJECTED" || o.status === "WITHDRAWN",
  );

  const bidPlanIds = new Set(offers.map((o) => o.planId).filter(Boolean) as string[]);

  const filteredPlans = planSearch
    ? openPlans.filter(
        (p) =>
          p.title.toLowerCase().includes(planSearch.toLowerCase()) ||
          p.destination.toLowerCase().includes(planSearch.toLowerCase()),
      )
    : openPlans;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <DashboardShell
      variant="agency"
      title="Bid Manager"
      subtitle="Submit offers on open trips, negotiate prices, and track every bid in one place."
    >
      {/* Feedback */}
      {feedback && (
        <div className="flex items-start gap-2 rounded-[var(--radius-lg)] bg-[var(--color-sunset-50)] p-4 text-sm text-[var(--color-sunset-700)]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{feedback}</span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2.5 shadow-[var(--shadow-sm)]">
            <Clock className="size-4 text-[var(--color-ink-400)]" />
            <span className="text-sm font-semibold text-[var(--color-ink-900)]">
              {activeOffers.length}
            </span>
            <span className="text-xs text-[var(--color-ink-500)]">active</span>
          </div>
          {needsActionOffers.length > 0 && (
            <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-sunset-200)] bg-[var(--color-sunset-50)] px-4 py-2.5 shadow-[var(--shadow-sm)]">
              <AlertCircle className="size-4 text-[var(--color-sunset-600)]" />
              <span className="text-sm font-semibold text-[var(--color-sunset-700)]">
                {needsActionOffers.length}
              </span>
              <span className="text-xs text-[var(--color-sunset-700)]">needs reply</span>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] px-4 py-2.5 shadow-[var(--shadow-sm)]">
            <CheckCircle className="size-4 text-[var(--color-sea-600)]" />
            <span className="text-sm font-semibold text-[var(--color-sea-700)]">
              {acceptedOffers.length}
            </span>
            <span className="text-xs text-[var(--color-sea-700)]">accepted</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            title="Refresh"
            className="flex size-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink-500)] transition hover:bg-[var(--color-surface-2)]"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <Button onClick={() => setShowBrowse((v) => !v)}>
            <Plus className="size-4" />
            New bid
          </Button>
        </div>
      </div>

      {/* Browse open plans panel */}
      {showBrowse && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg text-[var(--color-ink-950)]">
              Browse open trips
            </h3>
            <button
              type="button"
              onClick={() => setShowBrowse(false)}
              className="flex size-8 items-center justify-center rounded-full text-[var(--color-ink-400)] hover:bg-[var(--color-surface-2)]"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-ink-400)]" />
            <input
              type="text"
              value={planSearch}
              onChange={(e) => setPlanSearch(e.target.value)}
              placeholder="Search by title or destination…"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-2)] py-2 pl-9 pr-3 text-sm focus:border-[var(--color-sea-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sea-400)]/20"
            />
          </div>

          {loadingPlans ? (
            <p className="py-6 text-center text-sm text-[var(--color-ink-400)]">
              Loading open trips…
            </p>
          ) : filteredPlans.length === 0 ? (
            <EmptyState
              title="No open trips found"
              description={
                planSearch
                  ? "Try a different search term."
                  : "There are no open plans accepting offers right now."
              }
            />
          ) : (
            <div className="space-y-3">
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  alreadyBid={bidPlanIds.has(plan.id)}
                  onSelect={() => {
                    setSubmitForPlan(plan);
                    setShowBrowse(false);
                  }}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Loading state */}
      {loading ? (
        <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
          <div className="animate-pulse-soft text-center">
            <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
            <p className="text-sm">Loading your bids…</p>
          </div>
        </Card>
      ) : offers.length === 0 ? (
        <EmptyState
          title="No bids yet"
          description='Click "New bid" above to find open trips and submit your first offer.'
          action={
            <Button onClick={() => setShowBrowse(true)}>
              <Gavel className="size-4" />
              Browse open trips
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {/* Needs your response */}
          {needsActionOffers.length > 0 && (
            <section>
              <div className="mb-3 flex items-center gap-2">
                <AlertCircle className="size-5 text-[var(--color-sunset-600)]" />
                <h3 className="font-display text-lg text-[var(--color-ink-950)]">
                  Needs your response ({needsActionOffers.length})
                </h3>
              </div>
              <div className="space-y-4">
                {needsActionOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    isCreator={false}
                    isAgency
                    onCounter={(id) => setCounterSheetOfferId(id)}
                    onWithdraw={handleWithdraw}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Active bids */}
          {activeOffers.filter(
            (o) => !needsActionOffers.some((n) => n.id === o.id),
          ).length > 0 && (
            <section>
              <h3 className="mb-3 font-display text-lg text-[var(--color-ink-950)]">
                Active bids (
                {
                  activeOffers.filter(
                    (o) => !needsActionOffers.some((n) => n.id === o.id),
                  ).length
                }
                )
              </h3>
              <div className="space-y-4">
                {activeOffers
                  .filter((o) => !needsActionOffers.some((n) => n.id === o.id))
                  .map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      isCreator={false}
                      isAgency
                      onCounter={(id) => setCounterSheetOfferId(id)}
                      onWithdraw={handleWithdraw}
                    />
                  ))}
              </div>
            </section>
          )}

          {/* Accepted */}
          {acceptedOffers.length > 0 && (
            <section>
              <h3 className="mb-3 font-display text-lg text-[var(--color-ink-950)]">
                Won ({acceptedOffers.length})
              </h3>
              <div className="space-y-4">
                {acceptedOffers.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    isCreator={false}
                    isAgency
                    onCounter={() => {}}
                    onWithdraw={() => {}}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Closed / rejected */}
          {closedOffers.length > 0 && (
            <section>
              <details className="group">
                <summary className="mb-3 flex cursor-pointer list-none items-center justify-between">
                  <h3 className="font-display text-lg text-[var(--color-ink-500)]">
                    Closed ({closedOffers.length})
                  </h3>
                  <span className="text-xs text-[var(--color-ink-400)] group-open:hidden">
                    Show
                  </span>
                  <span className="hidden text-xs text-[var(--color-ink-400)] group-open:inline">
                    Hide
                  </span>
                </summary>
                <div className="space-y-4">
                  {closedOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      isCreator={false}
                      isAgency
                      onCounter={() => {}}
                      onWithdraw={() => {}}
                    />
                  ))}
                </div>
              </details>
            </section>
          )}
        </div>
      )}

      {/* Counter-offer sheet */}
      <CounterOfferSheet
        open={counterSheetOfferId !== null}
        onClose={() => setCounterSheetOfferId(null)}
        onSubmit={async (payload) => {
          if (!counterSheetOfferId) return;
          await handleCounter(counterSheetOfferId, payload);
        }}
        currentPrice={counteringOffer?.pricePerPerson ?? 0}
        counterRound={(counteringOffer?.negotiations?.length ?? 0) + 1}
        maxRounds={3}
      />

      {/* Submit offer modal */}
      <SubmitOfferModal
        plan={submitForPlan}
        onClose={() => setSubmitForPlan(null)}
        onSubmitted={(offer) => setOffers((cur) => upsertOffer(cur, offer))}
        apiFetchWithAuth={apiFetchWithAuth}
      />
    </DashboardShell>
  );
}
