"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { MessageSquareMore, ShieldCheck, Star, Wallet, ArrowDownUp, CheckCircle2, XCircle, Handshake, MailPlus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCurrency } from "@/lib/format";
import type { AgencySummary, Offer } from "@/lib/api/types";

export function OfferInbox({ planId }: { planId: string }) {
  const { apiFetchWithAuth } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [agencies, setAgencies] = useState<AgencySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"price" | "rating" | "inclusive">("price");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [counteringOffer, setCounteringOffer] = useState<Offer | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const [agencySearch, setAgencySearch] = useState("");
  const [counterPrice, setCounterPrice] = useState("");
  const [counterMessage, setCounterMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadOffers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetchWithAuth<Offer[]>(`/plans/${planId}/offers`);
      setOffers(data);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to load offers.");
    } finally {
      setLoading(false);
    }
  }, [apiFetchWithAuth, planId]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    if (!referralOpen || agencies.length > 0) return;

    void (async () => {
      try {
        const data = await apiFetchWithAuth<AgencySummary[]>("/agencies/browse");
        setAgencies(data);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to load agencies.");
      }
    })();
  }, [agencies.length, apiFetchWithAuth, referralOpen]);

  const sortedOffers = useMemo(() => {
    return [...offers].sort((left, right) => {
      if (sortBy === "rating") return right.agency.avgRating - left.agency.avgRating;
      if (sortBy === "inclusive") {
        return Object.keys(right.inclusions ?? {}).length - Object.keys(left.inclusions ?? {}).length;
      }
      return left.pricePerPerson - right.pricePerPerson;
    });
  }, [offers, sortBy]);

  const filteredAgencies = useMemo(() => {
    const query = agencySearch.trim().toLowerCase();
    const referredIds = new Set(offers.filter((offer) => offer.isReferred).map((offer) => offer.agency.id));
    return agencies.filter((agency) => {
      if (referredIds.has(agency.id)) return false;
      if (!query) return true;
      return (
        agency.name.toLowerCase().includes(query) ||
        agency.city?.toLowerCase().includes(query) ||
        agency.destinations?.some((destination) => destination.toLowerCase().includes(query))
      );
    });
  }, [agencySearch, agencies, offers]);

  function submitAction(action: "accept" | "reject", offerId: string) {
    startTransition(async () => {
      try {
        await apiFetchWithAuth(`/offers/${offerId}/${action}`, { method: "POST" });
        await loadOffers();
        setFeedback(action === "accept" ? "Offer accepted and plan moved to confirming." : "Offer rejected.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to update the offer.");
      }
    });
  }

  function submitCounter() {
    if (!counteringOffer) return;
    startTransition(async () => {
      try {
        await apiFetchWithAuth(`/offers/${counteringOffer.id}/counter`, {
          method: "POST",
          body: JSON.stringify({
            price: counterPrice ? Number(counterPrice) : undefined,
            message: counterMessage || undefined,
          }),
        });
        setCounteringOffer(null);
        setCounterPrice("");
        setCounterMessage("");
        await loadOffers();
        setFeedback("Counter-offer sent.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to send counter-offer.");
      }
    });
  }

  function toggleAgency(agencyId: string) {
    setSelectedAgencyIds((current) =>
      current.includes(agencyId)
        ? current.filter((id) => id !== agencyId)
        : [...current, agencyId],
    );
  }

  function submitReferral() {
    if (selectedAgencyIds.length === 0) return;

    startTransition(async () => {
      try {
        await apiFetchWithAuth(`/plans/${planId}/refer`, {
          method: "POST",
          body: JSON.stringify({ agencyIds: selectedAgencyIds }),
        });
        setReferralOpen(false);
        setSelectedAgencyIds([]);
        setAgencySearch("");
        await loadOffers();
        setFeedback("Plan referred to selected agencies.");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to refer this plan.");
      }
    });
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
        <div className="animate-pulse-soft text-center">
          <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
          <p className="text-sm">Loading offers...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="clay-blob -top-10 -right-10 size-28 bg-[var(--color-sea-200)] opacity-10" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
              Offer comparison
            </span>
            <h2 className="mt-2 font-display text-xl text-[var(--color-ink-950)] sm:text-2xl">
              Compare before you commit
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="soft" size="sm" onClick={() => setReferralOpen(true)}>
              <MailPlus className="size-3.5" />
              Refer plan
            </Button>
            <ArrowDownUp className="size-4 text-[var(--color-ink-500)]" />
            <Select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
              options={[
                { value: "price", label: "Sort by price" },
                { value: "rating", label: "Sort by rating" },
                { value: "inclusive", label: "Sort by inclusions" },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Feedback */}
      {feedback && (
        <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
          {feedback}
        </div>
      )}

      {/* Offer cards */}
      {sortedOffers.length === 0 ? (
        <CardInset className="p-8 text-center text-sm text-[var(--color-ink-500)]">
          No offers received yet. Agencies will bid once your plan is published.
        </CardInset>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {sortedOffers.map((offer) => {
            const inclusionCount = Object.keys(offer.inclusions ?? {}).length;
            return (
              <Card key={offer.id} className="relative overflow-hidden p-5 sm:p-6">
                <div className="clay-blob -top-8 -right-8 size-20 bg-[var(--color-lavender-200)] opacity-10" />

                <div className="relative space-y-4">
                  {/* Agency header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge variant={offer.status === "ACCEPTED" ? "sea" : offer.status === "REJECTED" ? "sunset" : "default"}>
                        {offer.status}
                      </Badge>
                      <h3 className="mt-2 truncate font-display text-lg text-[var(--color-ink-950)]">
                        <Link href={`/agencies/${offer.agency.slug}`} className="transition hover:text-[var(--color-sea-700)]">
                          {offer.agency.name}
                        </Link>
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-ink-600)]">
                        <Star className="size-3.5 fill-current text-[var(--color-sunset-500)]" />
                        {offer.agency.avgRating.toFixed(1)}
                      </p>
                      {offer.isReferred ? (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-sea-700)]">
                          Referred {offer.referredAt ? `· ${offer.referredAt.slice(0, 10)}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] px-4 py-2.5 text-right shadow-[var(--shadow-clay-sm)]">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-sea-700)]">Price</p>
                      <p className="font-display text-xl text-[var(--color-sea-800)]">
                        {formatCurrency(offer.pricePerPerson)}
                      </p>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-2">
                    <CardInset className="p-2.5 text-center">
                      <Wallet className="mx-auto size-4 text-[var(--color-sea-600)]" />
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Inclusions</p>
                      <p className="text-sm font-semibold text-[var(--color-ink-800)]">{inclusionCount}</p>
                    </CardInset>
                    <CardInset className="p-2.5 text-center">
                      <ShieldCheck className="mx-auto size-4 text-[var(--color-sea-600)]" />
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Valid</p>
                      <p className="text-sm font-semibold text-[var(--color-ink-800)]">
                        {offer.validUntil ? offer.validUntil.slice(5, 10) : "Open"}
                      </p>
                    </CardInset>
                    <CardInset className="p-2.5 text-center">
                      <MessageSquareMore className="mx-auto size-4 text-[var(--color-sea-600)]" />
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Rounds</p>
                      <p className="text-sm font-semibold text-[var(--color-ink-800)]">{offer.negotiations.length}</p>
                    </CardInset>
                  </div>

                  {/* Negotiation thread */}
                  {offer.negotiations.length > 0 && (
                    <CardInset className="max-h-40 overflow-y-auto hide-scrollbar">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                        Negotiation thread
                      </p>
                      <div className="space-y-2">
                        {offer.negotiations.map((negotiation) => (
                          <div
                            key={negotiation.id}
                            className={`rounded-[var(--radius-sm)] px-3 py-2 text-sm ${
                              negotiation.senderType === "user"
                                ? "bg-[var(--color-sea-50)] text-[var(--color-sea-800)]"
                                : "bg-[var(--color-surface-raised)] text-[var(--color-ink-700)]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
                              <span className="font-semibold">Round {negotiation.round}</span>
                              <span className="opacity-60">{negotiation.senderType}</span>
                            </div>
                            <p className="mt-1">
                              {negotiation.price ? formatCurrency(negotiation.price) : "No price change"}
                            </p>
                            {negotiation.message && (
                              <p className="mt-1 text-xs opacity-80">{negotiation.message}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardInset>
                  )}

                  {/* Actions */}
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button size="sm" onClick={() => submitAction("accept", offer.id)} disabled={isPending}>
                      <CheckCircle2 className="size-3.5" />
                      Accept
                    </Button>
                    <Button size="sm" variant="soft" onClick={() => setCounteringOffer(offer)} disabled={isPending}>
                      <Handshake className="size-3.5" />
                      Negotiate
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => submitAction("reject", offer.id)} disabled={isPending}>
                      <XCircle className="size-3.5" />
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <CardInset className="flex items-start gap-3 p-4 text-sm text-[var(--color-ink-600)]">
        <Handshake className="size-4 shrink-0 text-[var(--color-sea-600)] mt-0.5" />
        <span>Once you accept an offer, approved travelers can pay and coordinate inside the live group chat with polls.</span>
      </CardInset>

      {/* Counter-offer modal */}
      <Modal
        open={referralOpen}
        onClose={() => setReferralOpen(false)}
        title="Refer this plan to agencies"
        description="Choose operators you want to notify directly. They will see the plan in their referral inbox."
      >
        <div className="space-y-4">
          <Input
            value={agencySearch}
            onChange={(event) => setAgencySearch(event.target.value)}
            placeholder="Search by agency, city, or destination"
          />

          <div className="max-h-72 space-y-2 overflow-y-auto hide-scrollbar">
            {filteredAgencies.length === 0 ? (
              <CardInset className="p-4 text-sm text-[var(--color-ink-500)]">
                No additional agencies match this filter.
              </CardInset>
            ) : (
              filteredAgencies.map((agency) => (
                <button
                  key={agency.id}
                  type="button"
                  onClick={() => toggleAgency(agency.id)}
                  className={`w-full rounded-[var(--radius-md)] border px-4 py-3 text-left transition ${
                    selectedAgencyIds.includes(agency.id)
                      ? "border-[var(--color-sea-200)] bg-[var(--color-sea-50)] shadow-[var(--shadow-clay-sm)]"
                      : "border-white/50 bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-inset)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--color-ink-900)]">{agency.name}</p>
                      <p className="mt-1 text-xs text-[var(--color-ink-600)]">
                        {agency.city ?? "India"} · {(agency.destinations ?? []).slice(0, 3).join(", ") || "General operator"}
                      </p>
                    </div>
                    <Badge variant={selectedAgencyIds.includes(agency.id) ? "sea" : "default"}>
                      {selectedAgencyIds.includes(agency.id) ? "Selected" : "Select"}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setReferralOpen(false)}>Cancel</Button>
            <Button onClick={submitReferral} disabled={isPending || selectedAgencyIds.length === 0}>
              {isPending ? "Sending..." : `Refer to ${selectedAgencyIds.length} agenc${selectedAgencyIds.length === 1 ? "y" : "ies"}`}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(counteringOffer)}
        onClose={() => setCounteringOffer(null)}
        title="Send a counter-offer"
        description="Adjust the price or leave context for the agency before you accept."
      >
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Counter price (INR)</label>
            <Input
              type="number"
              value={counterPrice}
              onChange={(event) => setCounterPrice(event.target.value)}
              placeholder={counteringOffer ? String(counteringOffer.pricePerPerson) : ""}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Message</label>
            <Textarea
              value={counterMessage}
              onChange={(event) => setCounterMessage(event.target.value)}
              placeholder="Ask for transport, price adjustment, or itinerary flexibility."
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCounteringOffer(null)}>Cancel</Button>
            <Button onClick={submitCounter} disabled={isPending}>
              {isPending ? "Sending..." : "Send counter"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
