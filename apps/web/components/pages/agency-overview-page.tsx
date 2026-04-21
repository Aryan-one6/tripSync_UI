"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness, Handshake, Landmark, ArrowRight, MapPin,
  ShieldCheck, CheckCircle2, Circle, Camera, FileText, Package,
  Activity, Receipt, TrendingUp, TrendingDown, Users, Star,
  AlertCircle, Clock, BarChart3, Zap, Plus, Eye,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/cards/stat-card";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgencyVerificationBadge } from "@/components/ui/verification-badge";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCompactDate } from "@/lib/format";
import type { AgencyWalletSummary, Offer } from "@/lib/api/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AgencyPackage {
  id: string;
  title: string;
  destination: string;
  status: string;
  createdAt: string;
  group?: { currentSize: number } | null;
}

interface ActivityItem {
  id: string;
  type: "offer_created" | "offer_accepted" | "offer_rejected" | "offer_countered" | "package_created";
  label: string;
  sublabel?: string;
  timestamp: string;
  badge?: { label: string; variant: "sea" | "sunset" | "lavender" | "default" };
}

// ─── Quick Action Card ────────────────────────────────────────────────────────

function QuickAction({ href, icon: Icon, label, sub, accent }: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  accent: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <Icon className="size-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--color-ink-900)]">{label}</p>
        <p className="text-[11px] text-[var(--color-ink-500)]">{sub}</p>
      </div>
      <ArrowRight className="ml-auto size-4 text-[var(--color-ink-300)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, trend, icon: Icon, accent }: {
  label: string;
  value: string;
  sub?: string;
  trend?: { dir: "up" | "down"; pct: string };
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between">
        <div className={`flex size-10 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="size-5 text-white" />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${trend.dir === "up" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
            {trend.dir === "up" ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
            {trend.pct}
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-2xl font-black text-[var(--color-ink-950)]">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-[var(--color-ink-600)]">{label}</p>
      {sub && <p className="mt-1 text-[10px] text-[var(--color-ink-400)]">{sub}</p>}
    </div>
  );
}

// ─── Onboarding Checklist ────────────────────────────────────────────────────

function OnboardingChecklist({ hasGst, hasPhoto, hasPackages }: { hasGst: boolean; hasPhoto: boolean; hasPackages: boolean }) {
  const steps = [
    { done: hasGst, label: "Verify GST & PAN", sub: "Required for escrow payouts", href: "/agency/settings", icon: FileText, accent: "bg-emerald-500" },
    { done: hasPhoto, label: "Upload agency photos", sub: "Build traveler trust", href: "/agency/storefront", icon: Camera, accent: "bg-violet-500" },
    { done: hasPackages, label: "Create first package", sub: "Start attracting enquiries", href: "/agency/packages/new", icon: Package, accent: "bg-orange-500" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-400)]">Getting started</p>
          <h3 className="mt-0.5 font-display text-base font-bold text-[var(--color-ink-950)]">{allDone ? "✅ Setup complete!" : "Onboarding checklist"}</h3>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700 border border-emerald-100">
          {doneCount}/{steps.length}
        </span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <div className="space-y-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.label}
              href={step.done ? "#" : step.href}
              className={`flex items-center gap-3 rounded-lg p-3 transition-all ${step.done ? "bg-emerald-50 cursor-default" : "bg-[var(--color-surface-2)] hover:bg-emerald-50"}`}
            >
              {step.done ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <Circle className="size-4 shrink-0 text-gray-300" />}
              <div className={`flex size-7 shrink-0 items-center justify-center rounded-md ${step.accent}`}>
                <Icon className="size-3.5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${step.done ? "text-emerald-700 line-through" : "text-[var(--color-ink-800)]"}`}>{step.label}</p>
                <p className="text-[10px] text-[var(--color-ink-400)]">{step.sub}</p>
              </div>
              {!step.done && <ArrowRight className="size-3.5 shrink-0 text-gray-300" />}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-50 border border-violet-100">
          <Activity className="size-4 text-violet-600" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-400)]">Timeline</p>
          <h3 className="font-display text-base font-bold text-[var(--color-ink-950)]">Recent activity</h3>
        </div>
      </div>
      {items.length === 0 ? (
        <CardInset className="p-4 text-center text-sm text-[var(--color-ink-500)]">No activity yet. Submit your first offer to get started.</CardInset>
      ) : (
        <div className="relative space-y-0">
          <div className="absolute left-3.5 top-2 bottom-2 w-px bg-[var(--color-border)]" />
          {items.map((item, idx) => (
            <div key={item.id} className={`relative flex gap-3 ${idx < items.length - 1 ? "pb-4" : ""}`}>
              <div className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-white border border-[var(--color-border)] shadow-sm">
                {item.type === "offer_accepted" ? <CheckCircle2 className="size-3.5 text-emerald-600" /> :
                  item.type === "offer_rejected" ? <Receipt className="size-3.5 text-red-500" /> :
                  item.type === "package_created" ? <Package className="size-3.5 text-violet-500" /> :
                  <Handshake className="size-3.5 text-gray-400" />}
              </div>
              <div className="flex-1 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <p className="text-sm font-medium text-[var(--color-ink-800)]">{item.label}</p>
                  {item.badge && <Badge variant={item.badge.variant} className="text-[9px]">{item.badge.label}</Badge>}
                </div>
                {item.sublabel && <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{item.sublabel}</p>}
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-ink-400)]">{formatCompactDate(item.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Bid Pipeline ─────────────────────────────────────────────────────────────

function BidPipeline({ offers }: { offers: Offer[] }) {
  const stages = [
    { label: "Pending", status: "PENDING", color: "bg-amber-400", textColor: "text-amber-700", bg: "bg-amber-50" },
    { label: "Countered", status: "COUNTERED", color: "bg-violet-400", textColor: "text-violet-700", bg: "bg-violet-50" },
    { label: "Accepted", status: "ACCEPTED", color: "bg-emerald-400", textColor: "text-emerald-700", bg: "bg-emerald-50" },
    { label: "Rejected", status: "REJECTED", color: "bg-red-400", textColor: "text-red-700", bg: "bg-red-50" },
  ];

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-400)]">Pipeline</p>
          <h3 className="font-display text-base font-bold text-[var(--color-ink-950)]">Bid pipeline</h3>
        </div>
        <Link href="/agency/bids">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">View all <ArrowRight className="size-3" /></Button>
        </Link>
      </div>

      {/* Stage summary */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {stages.map((s) => {
          const count = offers.filter((o) => o.status === s.status).length;
          return (
            <div key={s.label} className={`rounded-lg p-2.5 text-center ${s.bg}`}>
              <p className={`font-display text-xl font-black ${s.textColor}`}>{count}</p>
              <p className={`text-[10px] font-medium ${s.textColor} opacity-75`}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Latest offers */}
      <div className="space-y-2">
        {offers.length === 0 ? (
          <CardInset className="p-4 text-center text-sm text-[var(--color-ink-500)]">No bids yet. Browse open plans to submit your first offer.</CardInset>
        ) : (
          offers.slice(0, 4).map((offer) => {
            const stage = stages.find((s) => s.status === offer.status);
            return (
              <div key={offer.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
                <div className={`size-2 rounded-full flex-shrink-0 ${stage?.color ?? "bg-gray-300"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{offer.plan?.title ?? "Unnamed plan"}</p>
                  <p className="text-[10px] text-[var(--color-ink-400)]">{formatCompactDate(offer.updatedAt)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-base font-bold text-[var(--color-sea-700)]">₹{offer.pricePerPerson.toLocaleString("en-IN")}</p>
                  <p className="text-[9px] text-[var(--color-ink-400)]">per person</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

// ─── Package Roster ────────────────────────────────────────────────────────────

function PackageRoster({ packages }: { packages: AgencyPackage[] }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-400)]">Inventory</p>
          <h3 className="font-display text-base font-bold text-[var(--color-ink-950)]">Package roster</h3>
        </div>
        <div className="flex gap-2">
          <Link href="/agency/packages/new">
            <Button size="sm" className="h-7 text-xs gap-1"><Plus className="size-3" /> New</Button>
          </Link>
          <Link href="/agency/packages">
            <Button variant="ghost" size="sm" className="h-7 text-xs">View all</Button>
          </Link>
        </div>
      </div>
      <div className="space-y-2">
        {packages.length === 0 ? (
          <CardInset className="p-4 text-center text-sm text-[var(--color-ink-500)]">No packages yet. Create your first travel package to attract groups.</CardInset>
        ) : (
          packages.slice(0, 5).map((pkg) => (
            <div key={pkg.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                <Package className="size-4 text-violet-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--color-ink-900)]">{pkg.title}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-ink-400)]">
                  <MapPin className="size-2.5" />{pkg.destination}
                  {pkg.group?.currentSize !== undefined && (
                    <><span>·</span><Users className="size-2.5" />{pkg.group.currentSize} members</>
                  )}
                </div>
              </div>
              <Badge variant={pkg.status === "OPEN" ? "sea" : "default"} className="text-[9px]">{pkg.status}</Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// ─── Revenue Insight ─────────────────────────────────────────────────────────

function RevenueInsight({ wallet, offers }: { wallet: AgencyWalletSummary | null; offers: Offer[] }) {
  const available = (wallet?.availableBalance ?? 0) / 100;
  const pending = (wallet?.pendingBalance ?? 0) / 100;
  const total = available + pending;
  const availPct = total > 0 ? Math.round((available / total) * 100) : 0;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-100">
          <BarChart3 className="size-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-400)]">Finance</p>
          <h3 className="font-display text-base font-bold text-[var(--color-ink-950)]">Revenue overview</h3>
        </div>
      </div>

      {/* Balance split */}
      <div className="mb-4 rounded-xl bg-[var(--color-surface-2)] p-4">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[10px] text-[var(--color-ink-400)]">Available balance</p>
            <p className="font-display text-2xl font-black text-emerald-700">₹{available.toLocaleString("en-IN")}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--color-ink-400)]">Pending</p>
            <p className="font-display text-lg font-bold text-amber-600">₹{pending.toLocaleString("en-IN")}</p>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${availPct}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-[var(--color-ink-400)]">
          <span>{availPct}% available</span>
          <span>Mode: {wallet?.payoutMode ?? "TRUST"}</span>
        </div>
      </div>

      {/* Payout CTA */}
      <Link href="/agency/settings">
        <Button variant="secondary" className="w-full h-9 text-xs gap-1.5">
          <Landmark className="size-3.5" />
          Manage payouts & wallet
          <ArrowRight className="size-3 ml-auto" />
        </Button>
      </Link>
    </Card>
  );
}

// ─── AgencyOverviewPage ───────────────────────────────────────────────────────

export function AgencyOverviewPage() {
  const { session, apiFetchWithAuth } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [packages, setPackages] = useState<AgencyPackage[]>([]);
  const [wallet, setWallet] = useState<AgencyWalletSummary | null>(null);

  useEffect(() => {
    void (async () => {
      const [offerData, packageData] = await Promise.all([
        apiFetchWithAuth<Offer[]>("/offers/my"),
        apiFetchWithAuth<AgencyPackage[]>("/packages/my"),
      ]);
      setOffers(offerData);
      setPackages(packageData);
      const walletData = await apiFetchWithAuth<AgencyWalletSummary>("/payments/wallet/summary").catch(() => null);
      setWallet(walletData);
    })();
  }, [apiFetchWithAuth]);

  const activeOffers = offers.filter((o) => o.status === "PENDING" || o.status === "COUNTERED");
  const acceptedOffers = offers.filter((o) => o.status === "ACCEPTED");

  const agencyData = session?.user.agency;
  const hasGst = Boolean(agencyData?.gstin && agencyData?.pan);
  const hasPhoto = Boolean(agencyData?.logoUrl);
  const hasPackages = packages.length > 0;

  const activityItems: ActivityItem[] = [
    ...offers.slice(0, 6).map((o): ActivityItem => ({
      id: o.id,
      type: o.status === "ACCEPTED" ? "offer_accepted" : o.status === "REJECTED" ? "offer_rejected" : o.status === "COUNTERED" ? "offer_countered" : "offer_created",
      label: o.status === "ACCEPTED" ? "Offer accepted" : o.status === "REJECTED" ? "Offer rejected" : o.status === "COUNTERED" ? "Counter-offer received" : "New offer submitted",
      sublabel: o.plan?.title ?? undefined,
      timestamp: o.updatedAt,
      badge: { label: o.status, variant: o.status === "ACCEPTED" ? "sea" : o.status === "REJECTED" ? "sunset" : o.status === "COUNTERED" ? "lavender" : "default" },
    })),
    ...packages.slice(0, 3).map((p): ActivityItem => ({
      id: `pkg-${p.id}`,
      type: "package_created",
      label: "Package published",
      sublabel: `${p.title} · ${p.destination}`,
      timestamp: p.createdAt,
      badge: { label: p.status, variant: p.status === "OPEN" ? "sea" : "default" },
    })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);

  const isVerified = agencyData?.verification === "VERIFIED";

  return (
    <DashboardShell
      variant="agency"
      title="Agency Overview"
      subtitle="Track bids, packages, wallet, and your response pipeline."
    >
      {/* Verification banner — only show if not verified */}
      {!isVerified && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="size-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm text-amber-800">
            Complete your verification to unlock escrow payouts and the verified badge on your storefront.
          </p>
          <Link href="/agency/settings">
            <Button variant="secondary" size="sm" className="h-7 text-xs shrink-0">
              Verify now <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-400)]">Quick actions</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/agency/packages/new" icon={Plus} label="Create Package" sub="Add a new trip package" accent="bg-emerald-500" />
          <QuickAction href="/agency/bids" icon={Handshake} label="Manage Bids" sub="View & respond to offers" accent="bg-violet-500" />
          <QuickAction href="/discover?audience=agency" icon={Eye} label="Browse Requests" sub="Find live group plans" accent="bg-sky-500" />
          <QuickAction href="/agency/analytics" icon={BarChart3} label="Analytics" sub="Revenue & performance" accent="bg-orange-500" />
        </div>
      </div>

      {/* KPI Metrics */}
      <div>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-400)]">Performance</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total packages"
            value={String(packages.length)}
            sub="Published & draft"
            icon={BriefcaseBusiness}
            accent="bg-emerald-500"
          />
          <MetricCard
            label="Active bids"
            value={String(activeOffers.length)}
            sub="Pending decision"
            trend={activeOffers.length > 0 ? { dir: "up", pct: `${activeOffers.length} open` } : undefined}
            icon={Handshake}
            accent="bg-violet-500"
          />
          <MetricCard
            label="Accepted offers"
            value={String(acceptedOffers.length)}
            sub="This month"
            icon={CheckCircle2}
            accent="bg-sky-500"
          />
          <MetricCard
            label="Wallet balance"
            value={`₹${((wallet?.availableBalance ?? 0) / 100).toLocaleString("en-IN")}`}
            sub={`₹${((wallet?.pendingBalance ?? 0) / 100).toLocaleString("en-IN")} pending`}
            icon={Landmark}
            accent="bg-orange-500"
          />
        </div>
      </div>

      {/* Verification + Storefront health */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--color-surface-2)]">
              <ShieldCheck className="size-5 text-[var(--color-sea-600)]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-400)]">Trust signal</p>
              <h3 className="font-display text-base font-bold text-[var(--color-ink-950)]">Verification status</h3>
              <p className="text-xs text-[var(--color-ink-500)]">Keep GSTIN, PAN & tourism licence current for the verified badge.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <AgencyVerificationBadge status={agencyData?.verification} />
            <Link href="/agency/settings">
              <Button variant="secondary" size="sm">Manage <ArrowRight className="size-3.5" /></Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        <OnboardingChecklist hasGst={hasGst} hasPhoto={hasPhoto} hasPackages={hasPackages} />
        <ActivityFeed items={activityItems} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <BidPipeline offers={offers} />
        <PackageRoster packages={packages} />
      </div>

      {/* Revenue */}
      <RevenueInsight wallet={wallet} offers={offers} />

    </DashboardShell>
  );
}
