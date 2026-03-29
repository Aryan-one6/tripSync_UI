"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, CreditCard, MessageSquareMore, Star, ExternalLink } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { WhatsAppShareButton } from "@/components/ui/whatsapp-share-button";
import { useAuth } from "@/lib/auth/auth-context";
import type { TripMembership } from "@/lib/api/types";
import { formatDateRange } from "@/lib/format";
import { buildWhatsAppShareHref } from "@/lib/share";

export default function TripsPage() {
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

  return (
    <DashboardShell
      variant="user"
      title="My trips"
      subtitle="Everything you have joined, whether it began as a community plan or a packaged departure."
    >
      {loading ? (
        <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
          <div className="animate-pulse-soft text-center">
            <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
            <p className="text-sm">Loading joined trips...</p>
          </div>
        </Card>
      ) : trips.length === 0 ? (
        <EmptyState
          title="No joined trips yet"
          description="Browse the discover feed and join a plan or package to see it here."
          action={
            <Link href="/discover">
              <Button>Explore trips</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {trips.map((trip) => {
            const plan = trip.group.plan;
            const pkg = trip.group.package;
            const href = plan ? `/plans/${plan.slug}` : pkg ? `/packages/${pkg.slug}` : "/discover";
            const title = plan?.title ?? pkg?.title ?? "Trip";
            const destination = plan?.destination ?? pkg?.destination ?? "Unknown";
            const dateLabel = formatDateRange(plan?.startDate ?? pkg?.startDate, plan?.endDate ?? pkg?.endDate);
            const needsPayment = plan?.status === "CONFIRMING" && trip.status !== "COMMITTED";
            const canChat = trip.status === "COMMITTED" || plan?.status === "CONFIRMED" || plan?.status === "COMPLETED";
            const canReview = plan?.status === "COMPLETED";
            const shareHref = buildWhatsAppShareHref(`Check this TravellersIn trip: ${title}`, href);

            return (
              <Card key={trip.id} className="relative overflow-hidden p-5">
                <div className="relative space-y-3">
                  <Badge variant={trip.status === "COMMITTED" ? "sea" : trip.status === "APPROVED" ? "lavender" : "default"}>
                    {trip.status}
                  </Badge>
                  <h2 className="truncate font-display text-lg text-[var(--color-ink-950)]">{title}</h2>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                    <MapPin className="size-3.5" />
                    {destination}
                  </div>
                  <p className="text-sm text-[var(--color-ink-500)]">{dateLabel}</p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link href={href}>
                      <Button variant="soft" size="sm">
                        <ExternalLink className="size-3.5" />
                        View trip
                      </Button>
                    </Link>
                    {needsPayment && (
                      <Link href={`/dashboard/groups/${trip.group.id}/checkout`}>
                        <Button size="sm">
                          <CreditCard className="size-3.5" />
                          Pay now
                        </Button>
                      </Link>
                    )}
                    {canChat && (
                      <Link href={`/dashboard/groups/${trip.group.id}/chat`}>
                        <Button variant="soft" size="sm">
                          <MessageSquareMore className="size-3.5" />
                          Chat
                        </Button>
                      </Link>
                    )}
                    {canReview && (
                      <Link href={`/dashboard/groups/${trip.group.id}/reviews`}>
                        <Button variant="soft" size="sm">
                          <Star className="size-3.5" />
                          Review
                        </Button>
                      </Link>
                    )}
                    <WhatsAppShareButton href={shareHref} label="Share" size="sm" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
