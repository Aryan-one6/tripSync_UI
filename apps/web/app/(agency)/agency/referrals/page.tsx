"use client";

import { useEffect, useState } from "react";
import { Mail, MapPin, CalendarRange, IndianRupee, User } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateRange, formatCurrency } from "@/lib/format";

interface ReferralOffer {
  id: string;
  referredAt?: string | null;
  status: string;
  plan: {
    id: string;
    title: string;
    destination: string;
    startDate?: string | null;
    endDate?: string | null;
    budgetMin?: number | null;
    budgetMax?: number | null;
    creator: { fullName: string };
  };
}

const statusVariant = (status: string) => {
  switch (status) {
    case "ACCEPTED":
      return "sea" as const;
    case "PENDING":
      return "lavender" as const;
    default:
      return "default" as const;
  }
};

export default function ReferralsPage() {
  const { apiFetchWithAuth } = useAuth();
  const [referrals, setReferrals] = useState<ReferralOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetchWithAuth<ReferralOffer[]>("/referrals/my");
        setReferrals(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiFetchWithAuth]);

  return (
    <DashboardShell
      variant="agency"
      title="Referral inbox"
      subtitle="Plans specifically referred to your agency, ready to be turned into priced offers."
    >
      {loading ? (
        <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
          <div className="animate-pulse-soft text-center">
            <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-lavender-100)] shadow-[var(--shadow-clay-sm)]" />
            <p className="text-sm">Loading referrals...</p>
          </div>
        </Card>
      ) : referrals.length === 0 ? (
        <EmptyState
          title="No referrals yet"
          description="When travelers refer a plan to your agency, it will show up here with the trip context attached."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {referrals.map((referral) => (
            <Card key={referral.id} className="relative overflow-hidden p-5">
              <div className="clay-blob -top-6 -right-6 size-16 bg-[var(--color-lavender-200)] opacity-10" />
              <div className="relative space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)] text-[var(--color-lavender-700)] shadow-[var(--shadow-clay-sm)]">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <Badge variant={statusVariant(referral.status)}>{referral.status}</Badge>
                    <h2 className="mt-2 font-display text-lg text-[var(--color-ink-950)]">
                      {referral.plan.title}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <CardInset className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-500)]">
                      <MapPin className="size-3" />
                      Destination
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--color-ink-800)]">
                      {referral.plan.destination}
                    </p>
                  </CardInset>
                  <CardInset className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-500)]">
                      <CalendarRange className="size-3" />
                      Dates
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--color-ink-800)]">
                      {formatDateRange(referral.plan.startDate, referral.plan.endDate)}
                    </p>
                  </CardInset>
                  <CardInset className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-500)]">
                      <IndianRupee className="size-3" />
                      Budget
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--color-ink-800)]">
                      {formatCurrency(referral.plan.budgetMin ?? 0)} – {formatCurrency(referral.plan.budgetMax ?? 0)}
                    </p>
                  </CardInset>
                  <CardInset className="p-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-500)]">
                      <User className="size-3" />
                      Creator
                    </div>
                    <p className="mt-1 text-sm font-medium text-[var(--color-ink-800)]">
                      {referral.plan.creator.fullName}
                    </p>
                  </CardInset>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
