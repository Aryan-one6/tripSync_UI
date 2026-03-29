"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Users, PlusCircle } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { WhatsAppShareButton } from "@/components/ui/whatsapp-share-button";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateRange } from "@/lib/format";
import { buildWhatsAppShareHref } from "@/lib/share";

interface MyPlan {
  id: string;
  slug: string;
  title: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  group?: { currentSize: number; maleCount: number; femaleCount: number; otherCount: number } | null;
  _count?: { offers: number };
}

export default function UserPlansPage() {
  const { apiFetchWithAuth } = useAuth();
  const [plans, setPlans] = useState<MyPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetchWithAuth<MyPlan[]>("/plans/my");
        setPlans(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiFetchWithAuth]);

  return (
    <DashboardShell
      variant="user"
      title="My plans"
      subtitle="Create, publish, and manage the trips you want the community and agencies to rally around."
    >
      {loading ? (
        <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
          <div className="animate-pulse-soft text-center">
            <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
            <p className="text-sm">Loading your plans...</p>
          </div>
        </Card>
      ) : plans.length === 0 ? (
        <EmptyState
          title="No plans yet"
          description="Use the 4-step wizard to publish your first trip and start receiving offers."
          action={
            <Link href="/dashboard/plans/new">
              <Button>
                <PlusCircle className="size-4" />
                Create a plan
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative overflow-hidden p-5">
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant={plan.status === "OPEN" ? "sea" : plan.status === "CONFIRMED" ? "lavender" : "default"}>
                      {plan.status}
                    </Badge>
                    <h2 className="mt-2 truncate font-display text-lg text-[var(--color-ink-950)]">{plan.title}</h2>
                    <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                      <MapPin className="size-3.5" />
                      {plan.destination}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-[var(--color-ink-600)]">{formatDateRange(plan.startDate, plan.endDate)}</p>

                <CardInset className="flex items-center justify-between p-3">
                  <span className="flex items-center gap-1.5 text-sm text-[var(--color-ink-700)]">
                    <Users className="size-3.5" />
                    {plan.group?.currentSize ?? 0} members
                  </span>
                  <span className="text-sm font-medium text-[var(--color-sea-700)]">
                    {plan._count?.offers ?? 0} offers
                  </span>
                </CardInset>

                <div className="flex flex-wrap items-center gap-3">
                  <WhatsAppShareButton
                    href={buildWhatsAppShareHref(`Check my TravellersIn plan: ${plan.title}`, `/plans/${plan.slug}`)}
                    label="Share"
                    size="sm"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
