"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquareMore, MapPin, ArrowRight } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import type { TripMembership } from "@/lib/api/types";
import { formatDateRange } from "@/lib/format";

export default function MessagesPage() {
  const { apiFetchWithAuth } = useAuth();
  const [trips, setTrips] = useState<TripMembership[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetchWithAuth<TripMembership[]>("/groups/my");
        setTrips(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiFetchWithAuth]);

  const chatGroups = useMemo(
    () =>
      trips.filter((trip) => {
        const status = trip.group.plan?.status;
        return trip.status === "COMMITTED" || status === "CONFIRMED" || status === "COMPLETED";
      }),
    [trips],
  );

  return (
    <DashboardShell
      variant="user"
      title="Messages"
      subtitle="Every group chat you can currently use. Direct messages are deferred until the core group flow is solid."
    >
      {loading ? (
        <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
          <div className="animate-pulse-soft text-center">
            <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
            <p className="text-sm">Loading your group chats...</p>
          </div>
        </Card>
      ) : chatGroups.length === 0 ? (
        <EmptyState
          title="No active group chats yet"
          description="Join and confirm a trip first. Once the group is active, its chat will show up here."
          action={
            <Link href="/dashboard/feed">
              <Button>Browse feed</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {chatGroups.map((trip) => {
            const plan = trip.group.plan;
            const pkg = trip.group.package;
            const title = plan?.title ?? pkg?.title ?? "Trip group";
            const destination = plan?.destination ?? pkg?.destination ?? "Destination pending";
            const dateLabel = formatDateRange(plan?.startDate ?? pkg?.startDate, plan?.endDate ?? pkg?.endDate);

            return (
              <Card key={trip.id} className="relative overflow-hidden p-5">
                <div className="clay-blob -top-6 -right-6 size-16 bg-[var(--color-sea-200)] opacity-10" />
                <div className="relative space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Badge variant={trip.status === "COMMITTED" ? "sea" : "lavender"}>
                        {trip.status}
                      </Badge>
                      <h2 className="mt-2 truncate font-display text-lg text-[var(--color-ink-950)]">{title}</h2>
                      <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                        <MapPin className="size-3.5" />
                        {destination}
                      </div>
                    </div>
                    <MessageSquareMore className="size-5 text-[var(--color-sea-600)]" />
                  </div>

                  <CardInset className="flex items-center justify-between p-3">
                    <span className="text-sm text-[var(--color-ink-700)]">{dateLabel}</span>
                    <Link
                      href={`/dashboard/groups/${trip.group.id}/chat`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-sea-700)] transition hover:text-[var(--color-sea-800)]"
                    >
                      Open chat
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </CardInset>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
