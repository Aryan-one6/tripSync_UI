"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BriefcaseBusiness, Handshake, Landmark, ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/cards/stat-card";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgencyVerificationBadge } from "@/components/ui/verification-badge";
import { useAuth } from "@/lib/auth/auth-context";
import type { Offer } from "@/lib/api/types";

interface AgencyPackage {
  id: string;
  title: string;
  destination: string;
  status: string;
  group?: { currentSize: number } | null;
}

export function AgencyOverviewPage() {
  const { session, apiFetchWithAuth } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [packages, setPackages] = useState<AgencyPackage[]>([]);

  useEffect(() => {
    void (async () => {
      const [offerData, packageData] = await Promise.all([
        apiFetchWithAuth<Offer[]>("/offers/my"),
        apiFetchWithAuth<AgencyPackage[]>("/packages/my"),
      ]);
      setOffers(offerData);
      setPackages(packageData);
    })();
  }, [apiFetchWithAuth]);

  const activeOffers = offers.filter((offer) => offer.status === "PENDING" || offer.status === "COUNTERED");
  const revenuePotential = offers.reduce((sum, offer) => sum + offer.pricePerPerson, 0);

  return (
    <DashboardShell
      variant="agency"
      title="Agency overview"
      subtitle="Track active bids, package momentum, and the health of your response pipeline."
    >
      {/* Verification banner */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="clay-blob -top-8 -right-8 size-24 bg-[var(--color-sand-200)] opacity-12" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sand-50)] to-[var(--color-sand-100)] text-[var(--color-ink-700)] shadow-[var(--shadow-clay-sm)]">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Verification</p>
              <h2 className="mt-1 font-display text-lg text-[var(--color-ink-950)]">Operator trust signal</h2>
              <p className="mt-1 text-sm text-[var(--color-ink-600)]">
                Keep GSTIN, PAN, and tourism license current so public pages can carry the verified badge.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AgencyVerificationBadge status={session?.user.agency?.verification} />
            <Link href="/agency/settings">
              <Button variant="secondary" size="sm">
                Manage verification
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Active packages"
          value={String(packages.length)}
          note="Published or draft departures under management."
          icon={<BriefcaseBusiness className="size-5" />}
        />
        <StatCard
          label="Active bids"
          value={String(activeOffers.length)}
          note="Offers still open for decision or negotiation."
          icon={<Handshake className="size-5" />}
        />
        <StatCard
          label="Price signal"
          value={`₹${revenuePotential.toLocaleString("en-IN")}`}
          note="Combined offer value across current bids."
          icon={<Landmark className="size-5" />}
        />
      </div>

      {/* Latest bids + packages */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Latest bids */}
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg text-[var(--color-ink-950)]">Latest bids</h2>
            <Link href="/agency/bids">
              <Badge variant="sea" className="cursor-pointer">View all</Badge>
            </Link>
          </div>
          <div className="space-y-3">
            {offers.length === 0 ? (
              <CardInset className="p-4 text-center text-sm text-[var(--color-ink-500)]">
                No bids yet. Browse open plans to submit your first offer.
              </CardInset>
            ) : (
              offers.slice(0, 4).map((offer) => (
                <div
                  key={offer.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-4 py-3 shadow-[var(--shadow-clay-inset)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{offer.plan?.title}</p>
                    <Badge variant={offer.status === "ACCEPTED" ? "sea" : offer.status === "REJECTED" ? "sunset" : "default"} className="mt-1">
                      {offer.status}
                    </Badge>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-lg text-[var(--color-sea-700)]">
                      ₹{offer.pricePerPerson.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Package roster */}
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg text-[var(--color-ink-950)]">Package roster</h2>
            <Link href="/agency/packages">
              <Badge variant="lavender" className="cursor-pointer">View all</Badge>
            </Link>
          </div>
          <div className="space-y-3">
            {packages.length === 0 ? (
              <CardInset className="p-4 text-center text-sm text-[var(--color-ink-500)]">
                No packages created yet. Start building your first travel package.
              </CardInset>
            ) : (
              packages.slice(0, 4).map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-4 py-3 shadow-[var(--shadow-clay-inset)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{pkg.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-ink-600)]">
                      <MapPin className="size-3" />
                      {pkg.destination}
                      <span className="text-[var(--color-ink-400)]">·</span>
                      {pkg.group?.currentSize ?? 0} members
                    </div>
                  </div>
                  <Badge variant={pkg.status === "OPEN" ? "sea" : "default"}>{pkg.status}</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
