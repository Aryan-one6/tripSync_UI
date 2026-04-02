"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  MapPin,
  Plus,
  Users,
  Eye,
  Pencil,
  ChevronRight,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCompactDate } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgencyPackage {
  id: string;
  slug: string;
  title: string;
  destination: string;
  destinationState?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  basePrice: number;
  groupSizeMin: number;
  groupSizeMax: number;
  status: string;
  createdAt: string;
  group?: { currentSize: number } | null;
}

type FilterTab = "all" | "OPEN" | "DRAFT" | "CLOSED";

const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "OPEN" },
  { label: "Draft", value: "DRAFT" },
  { label: "Closed", value: "CLOSED" },
];

// ─── Package Card ─────────────────────────────────────────────────────────────

function PackageCard({ pkg }: { pkg: AgencyPackage }) {
  const fillPct =
    pkg.groupSizeMax > 0
      ? Math.round(((pkg.group?.currentSize ?? 0) / pkg.groupSizeMax) * 100)
      : 0;

  const statusVariant =
    pkg.status === "OPEN"
      ? "sea"
      : pkg.status === "CONFIRMED"
        ? "lavender"
        : pkg.status === "DRAFT"
          ? "default"
          : "sunset";

  return (
    <Card className="group flex flex-col gap-0 overflow-hidden p-0 transition-all hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5">
      {/* Top accent bar */}
      <div
        className={`h-1 w-full ${
          pkg.status === "OPEN"
            ? "bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)]"
            : pkg.status === "DRAFT"
              ? "bg-[var(--color-ink-300)]"
              : "bg-gradient-to-r from-[var(--color-sunset-400)] to-[var(--color-sunset-600)]"
        }`}
      />

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-[var(--color-ink-950)]">
              {pkg.title}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--color-ink-600)]">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {pkg.destination}
                {pkg.destinationState ? `, ${pkg.destinationState}` : ""}
              </span>
            </div>
          </div>
          <Badge variant={statusVariant} className="shrink-0">
            {pkg.status}
          </Badge>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <CardInset className="p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">
              Price
            </p>
            <p className="font-display text-sm font-bold text-[var(--color-sea-700)]">
              ₹{pkg.basePrice.toLocaleString("en-IN")}
            </p>
          </CardInset>
          <CardInset className="p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">
              Group
            </p>
            <div className="flex items-center justify-center gap-1">
              <Users className="size-3 text-[var(--color-ink-500)]" />
              <p className="text-sm font-semibold text-[var(--color-ink-800)]">
                {pkg.group?.currentSize ?? 0}/{pkg.groupSizeMax}
              </p>
            </div>
          </CardInset>
          <CardInset className="p-2.5 text-center">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">
              Added
            </p>
            <p className="text-sm font-semibold text-[var(--color-ink-800)]">
              {formatCompactDate(pkg.createdAt)}
            </p>
          </CardInset>
        </div>

        {/* Fill progress */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">
            <span>Fill rate</span>
            <span>{fillPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)] transition-all duration-700"
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <Link href={`/packages/${pkg.slug}`} className="flex-1">
            <Button variant="secondary" size="sm" className="w-full">
              <Eye className="size-3.5" />
              View
            </Button>
          </Link>
          <Link href={`/agency/packages/${pkg.id}`} className="flex-1">
            <Button variant="soft" size="sm" className="w-full">
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

// ─── AgencyPackagesPage ───────────────────────────────────────────────────────

export function AgencyPackagesPage() {
  const { apiFetchWithAuth } = useAuth();
  const [packages, setPackages] = useState<AgencyPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const data = await apiFetchWithAuth<AgencyPackage[]>("/packages/my");
        setPackages(data);
      } catch {
        // fail silently — empty state handles it
      } finally {
        setLoading(false);
      }
    })();
  }, [apiFetchWithAuth]);

  const filtered =
    activeTab === "all" ? packages : packages.filter((p) => p.status === activeTab);

  return (
    <DashboardShell
      variant="agency"
      title="My packages"
      subtitle="Manage your published and draft travel departures."
      actions={
        <Link href="/agency/packages/new">
          <Button>
            <Plus className="size-4" />
            New package
          </Button>
        </Link>
      }
    >
      {/* Filter tabs */}
      <div className="flex gap-1.5 border-b border-[var(--color-border)] pb-0">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? packages.length
              : packages.filter((p) => p.status === tab.value).length;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`relative -mb-px flex items-center gap-2 rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.value
                  ? "border-b-2 border-[var(--color-sea-600)] text-[var(--color-sea-700)]"
                  : "text-[var(--color-ink-600)] hover:text-[var(--color-ink-900)]"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeTab === tab.value
                      ? "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                      : "bg-[var(--color-surface-2)] text-[var(--color-ink-500)]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-[var(--radius-lg)] bg-[var(--color-surface-2)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            activeTab === "all"
              ? "No packages yet"
              : `No ${activeTab.toLowerCase()} packages`
          }
          description={
            activeTab === "all"
              ? "Create your first travel package to start attracting group enquiries."
              : `You have no packages with ${activeTab} status right now.`
          }
          action={
            activeTab === "all" ? (
              <Link href="/agency/packages/new">
                <Button>
                  <Plus className="size-4" />
                  Create first package
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      )}

      {/* Summary footer */}
      {packages.length > 0 && (
        <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-surface-2)] px-4 py-3 text-sm text-[var(--color-ink-600)]">
          <span>
            {packages.filter((p) => p.status === "OPEN").length} active ·{" "}
            {packages.filter((p) => p.status === "DRAFT").length} draft ·{" "}
            {packages.length} total
          </span>
          <Link
            href="/agency/packages/new"
            className="flex items-center gap-1 font-medium text-[var(--color-sea-600)] transition hover:text-[var(--color-sea-700)]"
          >
            Add another <ChevronRight className="size-3.5" />
          </Link>
        </div>
      )}
    </DashboardShell>
  );
}
