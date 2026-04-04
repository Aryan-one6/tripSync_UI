"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Wallet,
  Package,
  Handshake,
  Star,
  ArrowUpRight,
  BarChart3,
  Clock,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/cards/stat-card";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/auth-context";
import type { AgencyWalletSummary, Offer } from "@/lib/api/types";

interface AgencyPackage {
  id: string;
  title: string;
  destination: string;
  status: string;
  basePrice: number;
  groupSizeMax: number;
  group?: { currentSize: number } | null;
  createdAt: string;
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Revenue bar chart (last 7 items) ────────────────────────────────────────

function RevenueChart({ offers }: { offers: Offer[] }) {
  const captured = offers.filter((o) => o.status === "ACCEPTED");
  const byMonth: Record<string, number> = {};
  for (const o of captured) {
    const month = new Date(o.updatedAt).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
    byMonth[month] = (byMonth[month] ?? 0) + o.pricePerPerson;
  }
  const entries = Object.entries(byMonth).slice(-6);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  if (entries.length === 0) {
    return (
      <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
        No accepted offers yet. Revenue data appears once offers are accepted.
      </CardInset>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[80px_1fr_70px] items-center gap-3">
          <span className="text-xs font-medium text-[var(--color-ink-500)]">{label}</span>
          <MiniBar
            value={value}
            max={maxVal}
            color="bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)]"
          />
          <span className="text-right text-xs font-semibold text-[var(--color-ink-800)]">
            ₹{value.toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Offer funnel ─────────────────────────────────────────────────────────────

function OfferFunnel({ offers }: { offers: Offer[] }) {
  const total = offers.length;
  const pending = offers.filter((o) => o.status === "PENDING").length;
  const countered = offers.filter((o) => o.status === "COUNTERED").length;
  const accepted = offers.filter((o) => o.status === "ACCEPTED").length;
  const rejected = offers.filter((o) => o.status === "REJECTED").length;
  const convRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

  const stages = [
    { label: "Total submitted", value: total, color: "bg-[var(--color-ink-300)]" },
    { label: "Pending decision", value: pending, color: "bg-[var(--color-lavender-400)]" },
    { label: "In negotiation", value: countered, color: "bg-[var(--color-sunset-400)]" },
    { label: "Accepted ✓", value: accepted, color: "bg-[var(--color-sea-500)]" },
    { label: "Rejected", value: rejected, color: "bg-[var(--color-sunset-600)]" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--color-ink-700)]">Conversion rate</p>
        <span className="font-display text-2xl font-bold text-[var(--color-sea-700)]">
          {convRate}%
        </span>
      </div>
      <div className="space-y-2.5">
        {stages.map((s) => (
          <div key={s.label} className="grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="space-y-1">
              <p className="text-xs text-[var(--color-ink-500)]">{s.label}</p>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${s.color}`}
                  style={{ width: total > 0 ? `${(s.value / total) * 100}%` : "0%" }}
                />
              </div>
            </div>
            <span className="text-sm font-semibold text-[var(--color-ink-800)]">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top packages ─────────────────────────────────────────────────────────────

function TopPackages({ packages }: { packages: AgencyPackage[] }) {
  const sorted = [...packages].sort(
    (a, b) => (b.group?.currentSize ?? 0) - (a.group?.currentSize ?? 0),
  );

  if (sorted.length === 0) {
    return (
      <CardInset className="p-4 text-center text-sm text-[var(--color-ink-500)]">
        No packages yet. Create your first package to see performance here.
      </CardInset>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.slice(0, 5).map((pkg, idx) => {
        const fillRate =
          pkg.groupSizeMax > 0
            ? Math.round(((pkg.group?.currentSize ?? 0) / pkg.groupSizeMax) * 100)
            : 0;
        return (
          <div
            key={pkg.id}
            className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-4 py-3"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-sea-50)] text-xs font-bold text-[var(--color-sea-700)]">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">
                {pkg.title}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-3)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)] transition-all"
                    style={{ width: `${fillRate}%` }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-[var(--color-sea-700)]">
                  {pkg.group?.currentSize ?? 0}/{pkg.groupSizeMax}
                </span>
              </div>
            </div>
            <Badge variant={pkg.status === "OPEN" ? "sea" : "default"}>{pkg.status}</Badge>
          </div>
        );
      })}
    </div>
  );
}

// ─── AgencyAnalyticsPage ──────────────────────────────────────────────────────

export default function AgencyAnalyticsPage() {
  const { apiFetchWithAuth } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [packages, setPackages] = useState<AgencyPackage[]>([]);
  const [wallet, setWallet] = useState<AgencyWalletSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [offerData, packageData, walletData] = await Promise.all([
          apiFetchWithAuth<Offer[]>("/offers/my").catch(() => [] as Offer[]),
          apiFetchWithAuth<AgencyPackage[]>("/packages/my").catch(() => [] as AgencyPackage[]),
          apiFetchWithAuth<AgencyWalletSummary>("/payments/wallet/summary").catch(() => null),
        ]);
        setOffers(offerData);
        setPackages(packageData);
        setWallet(walletData);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiFetchWithAuth]);

  const acceptedOffers = offers.filter((o) => o.status === "ACCEPTED");
  const pendingRevenue = offers
    .filter((o) => o.status === "PENDING" || o.status === "COUNTERED")
    .reduce((sum, o) => sum + o.pricePerPerson, 0);
  const totalRevenuePotential = acceptedOffers.reduce((sum, o) => sum + o.pricePerPerson, 0);
  const avgResponseTime = "< 4h"; // static for now — would need createdAt vs first negotiation

  return (
    <DashboardShell
      variant="agency"
      title="Analytics"
      subtitle="Revenue trends, offer conversion, and package performance — all in one view."
    >
      {/* KPI stat cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Available balance"
          value={`₹${((wallet?.availableBalance ?? 0) / 100).toLocaleString("en-IN")}`}
          note={`Pending: ₹${((wallet?.pendingBalance ?? 0) / 100).toLocaleString("en-IN")}`}
          icon={<Wallet className="size-5" />}
        />
        <StatCard
          label="Total earned"
          value={`₹${((wallet?.totalEarned ?? 0) / 100).toLocaleString("en-IN")}`}
          note={`Commission paid: ₹${((wallet?.totalCommission ?? 0) / 100).toLocaleString("en-IN")}`}
          icon={<TrendingUp className="size-5" />}
        />
        <StatCard
          label="Revenue potential"
          value={`₹${totalRevenuePotential.toLocaleString("en-IN")}`}
          note={`Pipeline: ₹${pendingRevenue.toLocaleString("en-IN")} pending`}
          icon={<BarChart3 className="size-5" />}
        />
        <StatCard
          label="Avg. response time"
          value={avgResponseTime}
          note="Based on recent bid activity"
          icon={<Clock className="size-5" />}
        />
      </div>

      {/* Revenue trend + funnel */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Revenue by month */}
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]">
              <TrendingUp className="size-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Over time
              </p>
              <h2 className="font-display text-lg text-[var(--color-ink-950)]">Revenue trend</h2>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3 animate-pulse-soft">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-5 rounded bg-[var(--color-surface-2)]" />
              ))}
            </div>
          ) : (
            <RevenueChart offers={offers} />
          )}
        </Card>

        {/* Offer funnel */}
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)] text-[var(--color-lavender-500)] shadow-[var(--shadow-sm)]">
              <Handshake className="size-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Conversion
              </p>
              <h2 className="font-display text-lg text-[var(--color-ink-950)]">Offer funnel</h2>
            </div>
          </div>
          {loading ? (
            <div className="space-y-3 animate-pulse-soft">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-5 rounded bg-[var(--color-surface-2)]" />
              ))}
            </div>
          ) : (
            <OfferFunnel offers={offers} />
          )}
        </Card>
      </div>

      {/* Top packages + payout mode */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.6fr]">
        {/* Top packages */}
        <Card className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] text-[var(--color-sunset-700)] shadow-[var(--shadow-sm)]">
                <Package className="size-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                  Fill rate
                </p>
                <h2 className="font-display text-lg text-[var(--color-ink-950)]">
                  Top packages
                </h2>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-400)]">
              {packages.length} total
            </span>
          </div>
          {loading ? (
            <div className="space-y-3 animate-pulse-soft">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-[var(--color-surface-2)]" />
              ))}
            </div>
          ) : (
            <TopPackages packages={packages} />
          )}
        </Card>

        {/* Payout mode + rating */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Wallet className="size-4 text-[var(--color-sea-600)]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Payout mode
              </p>
            </div>
            <p className="font-display text-2xl font-bold text-[var(--color-ink-950)]">
              {wallet?.payoutMode ?? "TRUST"}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-600)]">
              {wallet?.payoutMode === "PRO"
                ? "30% advance at confirmation — faster cash flow."
                : "100% escrow held until trip milestones complete."}
            </p>
            {wallet?.payoutMode !== "PRO" && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-sea-700)]">
                <ArrowUpRight className="size-3.5" />
                <span>Complete 10+ trips to unlock Pro mode</span>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Star className="size-4 text-[var(--color-sunset-600)]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Offers accepted
              </p>
            </div>
            <p className="font-display text-2xl font-bold text-[var(--color-ink-950)]">
              {acceptedOffers.length}
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-600)]">
              of {offers.length} total bids submitted
            </p>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
