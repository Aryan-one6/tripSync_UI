"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, CreditCard, MessageSquareMore, Star, ExternalLink, Users2 } from "lucide-react";
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
            const needsPayment = (plan?.status === "CONFIRMING" || pkg?.status === "CONFIRMING") && trip.status !== "COMMITTED";
            // Chat unlocks as soon as you are approved — no need to wait for COMMITTED
            const canChat =
              trip.status === "APPROVED" ||
              trip.status === "COMMITTED" ||
              plan?.status === "CONFIRMED" ||
              plan?.status === "COMPLETED";
            const canDM = trip.status === "APPROVED" || trip.status === "COMMITTED";
            const canReview = plan?.status === "COMPLETED" || pkg?.status === "COMPLETED";
            const isPaid = trip.status === "COMMITTED";
            const shareHref = buildWhatsAppShareHref(`Check this TravellersIn trip: ${title}`, href);
            const tripStatus = plan?.status ?? pkg?.status;
            const packagePrice = pkg?.basePrice;

            // Visual strip color per status
            const stripColor =
              trip.status === "COMMITTED"
                ? "bg-[var(--color-sea-500)]"
                : trip.status === "APPROVED"
                ? "bg-[var(--color-lavender-400)]"
                : "bg-[var(--color-ink-300)]";

            return (
              <Card key={trip.id} className="relative overflow-hidden p-0">
                {/* Status colour strip */}
                <div className={`h-1.5 w-full ${stripColor} rounded-t-[var(--radius-lg)]`} />

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={trip.status === "COMMITTED" ? "sea" : trip.status === "APPROVED" ? "lavender" : "default"}>
                      {trip.status}
                    </Badge>
                    {tripStatus && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-400)]">
                        {tripStatus}
                      </span>
                    )}
                  </div>

                  <div>
                    <h2 className="truncate font-display text-lg text-[var(--color-ink-950)]">{title}</h2>
                    <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                      <MapPin className="size-3.5" />
                      {destination}
                    </div>
                    {dateLabel && (
                      <p className="mt-0.5 text-sm text-[var(--color-ink-500)]">{dateLabel}</p>
                    )}
                    {packagePrice && (
                      <p className="mt-1 text-sm font-semibold text-[var(--color-sea-700)]">
                        ₹{packagePrice.toLocaleString("en-IN")} / person
                      </p>
                    )}
                  </div>

                  {/* Payment progress bar */}
                  {needsPayment && (
                    <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] border border-[var(--color-sunset-200)] px-3 py-2 text-xs text-[var(--color-sunset-700)] font-medium">
                      ⚡ Payment required to confirm your seat
                    </div>
                  )}

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
                          Group Chat
                        </Button>
                      </Link>
                    )}
                    {canDM && (
                      <Link href="/dashboard/messages">
                        <Button variant="soft" size="sm">
                          <Users2 className="size-3.5" />
                          DM Travelers
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

                  {/* Cancellation request link — only for paid trips not yet completed */}
                  {isPaid && tripStatus !== "COMPLETED" && tripStatus !== "CANCELLED" && (
                    <p className="pt-1 text-[11px] text-[var(--color-ink-400)]">
                      Need to cancel?{" "}
                      <a
                        href={`/dashboard/groups/${trip.group.id}/chat`}
                        className="font-medium text-[var(--color-sunset-600)] underline decoration-dotted hover:text-[var(--color-sunset-500)]"
                      >
                        Contact agency in group chat
                      </a>
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardShell>
  );
}
