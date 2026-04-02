"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Handshake,
  Landmark,
  ArrowRight,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Camera,
  FileText,
  Package,
  Activity,
  Receipt,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { StatCard } from "@/components/cards/stat-card";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgencyVerificationBadge } from "@/components/ui/verification-badge";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCompactDate } from "@/lib/format";
import type { Offer } from "@/lib/api/types";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Onboarding Checklist ────────────────────────────────────────────────────

function OnboardingChecklist({
  hasGst,
  hasPhoto,
  hasPackages,
}: {
  hasGst: boolean;
  hasPhoto: boolean;
  hasPackages: boolean;
}) {
  const steps = [
    {
      done: hasGst,
      label: "Verify GST & PAN",
      sublabel: "Required for escrow payouts",
      href: "/agency/settings",
      icon: FileText,
    },
    {
      done: hasPhoto,
      label: "Upload agency photos",
      sublabel: "Build traveler trust",
      href: "/agency/storefront",
      icon: Camera,
    },
    {
      done: hasPackages,
      label: "Create first package",
      sublabel: "Start attracting group enquiries",
      href: "/agency/packages/new",
      icon: Package,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
            Getting started
          </p>
          <h2 className="mt-1 font-display text-lg text-[var(--color-ink-950)]">
            {allDone ? "✅ Setup complete!" : "Onboarding checklist"}
          </h2>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-sm font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]">
          {doneCount}/{steps.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)] transition-all duration-700"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.label}
              href={step.done ? "#" : step.href}
              className={`flex items-center gap-3 rounded-[var(--radius-md)] p-3 transition-all ${
                step.done
                  ? "bg-[var(--color-sea-50)] cursor-default"
                  : "bg-[var(--color-surface-2)] hover:bg-[var(--color-sea-50)] hover:shadow-[var(--shadow-sm)]"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="size-5 shrink-0 text-[var(--color-sea-600)]" />
              ) : (
                <Circle className="size-5 shrink-0 text-[var(--color-ink-400)]" />
              )}
              <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] shadow-[var(--shadow-sm)]">
                <Icon className="size-4 text-[var(--color-sea-700)]" />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    step.done
                      ? "text-[var(--color-sea-700)] line-through decoration-[var(--color-sea-400)]"
                      : "text-[var(--color-ink-800)]"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[11px] text-[var(--color-ink-500)]">{step.sublabel}</p>
              </div>
              {!step.done && (
                <ArrowRight className="size-4 shrink-0 text-[var(--color-ink-400)] group-hover:text-[var(--color-sea-600)]" />
              )}
            </Link>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Recent Activity Feed ─────────────────────────────────────────────────────

function RecentActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)] text-[var(--color-lavender-700)] shadow-[var(--shadow-sm)]">
          <Activity className="size-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
            Timeline
          </p>
          <h2 className="font-display text-lg text-[var(--color-ink-950)]">Recent activity</h2>
        </div>
      </div>

      {items.length === 0 ? (
        <CardInset className="p-4 text-center text-sm text-[var(--color-ink-500)]">
          No activity yet. Submit your first offer to get started.
        </CardInset>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-px bg-[var(--color-border)]" />

          {items.map((item, idx) => (
            <div key={item.id} className={`relative flex gap-4 ${idx < items.length - 1 ? "pb-4" : ""}`}>
              {/* Timeline dot */}
              <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-white border border-[var(--color-border)] shadow-[var(--shadow-sm)]">
                {item.type === "offer_accepted" ? (
                  <CheckCircle2 className="size-4 text-[var(--color-sea-600)]" />
                ) : item.type === "offer_rejected" ? (
                  <Receipt className="size-4 text-[var(--color-sunset-600)]" />
                ) : item.type === "package_created" ? (
                  <Package className="size-4 text-[var(--color-lavender-500)]" />
                ) : (
                  <Handshake className="size-4 text-[var(--color-ink-500)]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--color-ink-800)]">{item.label}</p>
                  {item.badge && (
                    <Badge variant={item.badge.variant}>{item.badge.label}</Badge>
                  )}
                </div>
                {item.sublabel && (
                  <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{item.sublabel}</p>
                )}
                <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--color-ink-400)]">
                  {formatCompactDate(item.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── AgencyOverviewPage ───────────────────────────────────────────────────────

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

  // Onboarding checklist signals
  const agencyData = session?.user.agency;
  const hasGst = Boolean(agencyData?.gstin && agencyData?.pan);
  const hasPhoto = Boolean(agencyData?.logoUrl);
  const hasPackages = packages.length > 0;

  // Build activity feed from offers + packages (latest first)
  const activityItems: ActivityItem[] = [
    ...offers.slice(0, 6).map((o): ActivityItem => ({
      id: o.id,
      type:
        o.status === "ACCEPTED"
          ? "offer_accepted"
          : o.status === "REJECTED"
            ? "offer_rejected"
            : o.status === "COUNTERED"
              ? "offer_countered"
              : "offer_created",
      label:
        o.status === "ACCEPTED"
          ? "Offer accepted"
          : o.status === "REJECTED"
            ? "Offer rejected"
            : o.status === "COUNTERED"
              ? "Counter-offer received"
              : "New offer submitted",
      sublabel: o.plan?.title ?? undefined,
      timestamp: o.updatedAt,
      badge: {
        label: o.status,
        variant:
          o.status === "ACCEPTED"
            ? "sea"
            : o.status === "REJECTED"
              ? "sunset"
              : o.status === "COUNTERED"
                ? "lavender"
                : "default",
      },
    })),
    ...packages.slice(0, 3).map((p): ActivityItem => ({
      id: `pkg-${p.id}`,
      type: "package_created",
      label: "Package published",
      sublabel: `${p.title} · ${p.destination}`,
      timestamp: p.createdAt,
      badge: { label: p.status, variant: p.status === "OPEN" ? "sea" : "default" },
    })),
  ]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 8);

  return (
    <DashboardShell
      variant="agency"
      title="Agency overview"
      subtitle="Track active bids, package momentum, and the health of your response pipeline."
    >
      {/* Verification banner */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
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

      {/* Onboarding + Activity */}
      <div className="grid gap-5 lg:grid-cols-2">
        <OnboardingChecklist hasGst={hasGst} hasPhoto={hasPhoto} hasPackages={hasPackages} />
        <RecentActivityFeed items={activityItems} />
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
                    <Badge
                      variant={
                        offer.status === "ACCEPTED"
                          ? "sea"
                          : offer.status === "REJECTED"
                            ? "sunset"
                            : "default"
                      }
                      className="mt-1"
                    >
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
