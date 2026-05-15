"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

type AgencyPlanFilterCardsProps = {
  audience: "traveler" | "agency";
  q: string;
  destination: string;
  vibes: string;
  originType?: "plan" | "package";
  planType?: "STANDARD" | "CORPORATE";
  sort: "price_low" | "price_high" | "popular" | "recent";
  rail: "for-you" | "following" | "trending";
};

const AGENCY_QUICK_FILTERS = [
  {
    id: "user-plans",
    label: "User Plans",
    originType: "plan" as const,
    planType: "STANDARD" as const,
    icon: Users,
    description: "Open traveler plans looking for agency quotes",
  },
  {
    id: "corporate-plans",
    label: "Corporate Plans",
    originType: "plan" as const,
    planType: "CORPORATE" as const,
    icon: Building2,
    description: "Corporate travel requests for business groups",
  },
] as const;

export function AgencyPlanFilterCards({
  audience,
  q,
  destination,
  vibes,
  originType,
  planType,
  sort,
  rail,
}: AgencyPlanFilterCardsProps) {
  const { session, status } = useAuth();
  const router = useRouter();
  const isAgencySignedIn = status === "authenticated" && session?.role === "agency_admin";

  useEffect(() => {
    if (status === "loading") return;
    if (audience !== "agency") return;
    if (isAgencySignedIn) return;

    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set("audience", "traveler");
    nextParams.delete("planType");

    const query = nextParams.toString();
    router.replace(query ? `/discover?${query}` : "/discover?audience=traveler");
  }, [audience, isAgencySignedIn, router, status]);

  if (audience !== "agency" || !isAgencySignedIn) return null;

  function buildDiscoverHref(filter: (typeof AGENCY_QUICK_FILTERS)[number]) {
    const nextParams = new URLSearchParams();
    const entries: Record<string, string | undefined> = {
      q: q || undefined,
      audience,
      destination: destination || undefined,
      vibes: vibes || undefined,
      originType: filter.originType ?? originType,
      planType: filter.planType ?? planType,
      sort,
      rail,
    };

    for (const [key, value] of Object.entries(entries)) {
      if (value) nextParams.set(key, value);
    }

    const qs = nextParams.toString();
    return qs ? `/discover?${qs}` : `/discover?audience=${audience}`;
  }

  function isActive(filter: (typeof AGENCY_QUICK_FILTERS)[number]) {
    return planType === filter.planType && originType === filter.originType;
  }

  return (
    <div className="mb-5 grid grid-cols-2 gap-3">
      {AGENCY_QUICK_FILTERS.map((filter) => {
        const Icon = filter.icon;
        const active = isActive(filter);
        return (
          <Link key={filter.id} href={buildDiscoverHref(filter)} className="block">
            <div
              className={`flex items-start gap-3 rounded-xl border p-3.5 transition ${
                active
                  ? filter.id === "corporate-plans"
                    ? "border-violet-300 bg-violet-50 shadow-[0_4px_14px_rgba(139,92,246,0.15)]"
                    : "border-emerald-300 bg-emerald-50 shadow-[0_4px_14px_rgba(16,185,129,0.15)]"
                  : "border-[var(--color-border)] bg-white hover:border-emerald-200 hover:bg-emerald-50/50"
              }`}
            >
              <div
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                  active
                    ? filter.id === "corporate-plans"
                      ? "bg-violet-500 text-white"
                      : "bg-emerald-500 text-white"
                    : "bg-[var(--color-surface-2)] text-[var(--color-ink-600)]"
                }`}
              >
                <Icon className="size-4" />
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    active
                      ? filter.id === "corporate-plans"
                        ? "text-violet-800"
                        : "text-emerald-800"
                      : "text-[var(--color-ink-900)]"
                  }`}
                >
                  {filter.label}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-ink-500)]">
                  {filter.description}
                </p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

