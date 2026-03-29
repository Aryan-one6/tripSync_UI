"use client";

import { useEffect, useState } from "react";
import { Gavel, MapPin, MessageSquare, IndianRupee } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth/auth-context";
import type { Offer } from "@/lib/api/types";

const statusVariant = (status: string) => {
  switch (status) {
    case "ACCEPTED":
      return "sea" as const;
    case "REJECTED":
      return "sunset" as const;
    case "NEGOTIATING":
      return "lavender" as const;
    default:
      return "default" as const;
  }
};

export default function AgencyBidsPage() {
  const { apiFetchWithAuth } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetchWithAuth<Offer[]>("/offers/my");
        setOffers(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiFetchWithAuth]);

  return (
    <DashboardShell
      variant="agency"
      title="Bid manager"
      subtitle="A single place to track plan demand, negotiation history, and the state of every submitted offer."
    >
      {loading ? (
        <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
          <div className="animate-pulse-soft text-center">
            <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
            <p className="text-sm">Loading your bids...</p>
          </div>
        </Card>
      ) : offers.length === 0 ? (
        <EmptyState
          title="No bids submitted yet"
          description="Browse open plans and submit offers to see your bid history here."
        />
      ) : (
        <div className="grid gap-5">
          {offers.map((offer) => (
            <Card key={offer.id} className="relative overflow-hidden p-5 sm:p-6">
              <div className="relative space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                      <Gavel className="size-5" />
                    </div>
                    <div>
                      <Badge variant={statusVariant(offer.status)}>{offer.status}</Badge>
                      <h2 className="mt-2 font-display text-lg text-[var(--color-ink-950)]">
                        {offer.plan?.title}
                      </h2>
                      <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                        <MapPin className="size-3.5" />
                        {offer.plan?.destination}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] px-4 py-2.5 text-center shadow-[var(--shadow-clay-sm)]">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                      Price / person
                    </p>
                    <p className="mt-0.5 font-display text-2xl text-[var(--color-sea-700)]">
                      ₹{offer.pricePerPerson.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                {/* Negotiation rounds */}
                {offer.negotiations.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {offer.negotiations.map((negotiation) => (
                      <CardInset key={negotiation.id} className="space-y-2 p-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="default">Round {negotiation.round}</Badge>
                          {negotiation.price && (
                            <span className="flex items-center gap-1 text-sm font-semibold text-[var(--color-sea-700)]">
                              <IndianRupee className="size-3" />
                              {negotiation.price.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        {negotiation.message && (
                          <div className="flex items-start gap-2 text-sm text-[var(--color-ink-600)]">
                            <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-[var(--color-ink-400)]" />
                            <p>{negotiation.message}</p>
                          </div>
                        )}
                        {!negotiation.price && !negotiation.message && (
                          <p className="text-sm text-[var(--color-ink-500)]">No price adjustment</p>
                        )}
                      </CardInset>
                    ))}
                  </div>
                ) : (
                  <CardInset className="p-4 text-center text-sm text-[var(--color-ink-500)]">
                    No negotiation rounds yet.
                  </CardInset>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
