"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Gift, Handshake, Link2, MapPin, RefreshCcw, Send, Sparkles, Ticket } from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AgencyVerificationBadge } from "@/components/ui/verification-badge";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateRange } from "@/lib/format";
import type { AgencySummary } from "@/lib/api/types";
import {
  generateReferralLink,
  getMyReferralsSafe,
  getReferralStatsSafe,
  type MyReferral,
  type ReferralLink,
  type ReferralStats,
} from "@/lib/api/referrals";
import { useReferralUpdates } from "@/lib/realtime/use-referral-updates";

interface MyPlan {
  id: string;
  slug: string;
  title: string;
  destination: string;
  startDate?: string | null;
  endDate?: string | null;
  status: string;
  _count?: { offers: number };
}

export default function ReferAndEarnPage() {
  const { apiFetchWithAuth, session } = useAuth();
  const [plans, setPlans] = useState<MyPlan[]>([]);
  const [agencies, setAgencies] = useState<AgencySummary[]>([]);
  const [inviteLink, setInviteLink] = useState<ReferralLink | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [myReferrals, setMyReferrals] = useState<MyReferral[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReferralLoading, setIsReferralLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const token = session?.accessToken ?? "";

  const loadReferralData = useCallback(async () => {
    if (!token) return;

    setIsReferralLoading(true);
    try {
      const [stats, referrals] = await Promise.all([
        getReferralStatsSafe(token),
        getMyReferralsSafe(token, 1, 6),
      ]);
      setReferralStats(stats);
      setMyReferrals(referrals.referrals);
    } catch (error) {
      console.error("[refer-and-earn] failed to load referral data:", error);
    } finally {
      setIsReferralLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void (async () => {
      try {
        const [planData, agencyData] = await Promise.all([
          apiFetchWithAuth<MyPlan[]>("/plans/my"),
          apiFetch<AgencySummary[]>("/agencies/browse", { query: { limit: 24 } }),
        ]);
        setPlans(planData);
        setAgencies(agencyData);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to load referral tools.");
      } finally {
        setLoading(false);
      }
    })();
  }, [apiFetchWithAuth]);

  useEffect(() => {
    void loadReferralData();
  }, [loadReferralData]);

  useReferralUpdates({
    enabled: Boolean(token),
    onNewInvite: () => {
      void loadReferralData();
    },
    onStatusChanged: () => {
      void loadReferralData();
    },
  });

  const openPlans = useMemo(() => plans.filter((plan) => plan.status === "OPEN"), [plans]);

  useEffect(() => {
    if (!selectedPlanId && openPlans.length > 0) {
      setSelectedPlanId(openPlans[0].id);
    }
  }, [openPlans, selectedPlanId]);

  const selectedPlan = openPlans.find((plan) => plan.id === selectedPlanId) ?? null;
  const normalizedSearch = search.trim().toLowerCase();
  const filteredAgencies = agencies.filter((agency) => {
    if (!normalizedSearch) return true;
    return [
      agency.name,
      agency.city,
      agency.state,
      ...(agency.destinations ?? []),
      ...(agency.specializations ?? []),
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch));
  });

  function toggleAgency(agencyId: string) {
    setSelectedAgencyIds((current) =>
      current.includes(agencyId)
        ? current.filter((id) => id !== agencyId)
        : current.length >= 10
          ? current
          : [...current, agencyId],
    );
  }

  async function handleGenerateInviteLink() {
    if (!token) return;
    try {
      const link = await generateReferralLink(token);
      setInviteLink(link);
      setFeedback("Referral invite link generated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to generate referral link.");
    }
  }

  async function handleCopyInviteLink() {
    if (!inviteLink?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(inviteLink.shareUrl);
      setFeedback("Referral link copied.");
    } catch {
      setFeedback("Unable to copy link. Please copy it manually.");
    }
  }

  return (
    <DashboardShell
      variant="user"
      title="Refer & Earn"
      subtitle="Send your open plan to strong-fit agencies so offer conversations start faster from inside TripSync."
    >
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                <Gift className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                  Referral flow
                </p>
                <h2 className="font-display text-lg text-[var(--color-ink-950)]">Push your plan to agencies</h2>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-ink-600)]">
              Pick an open plan, select up to 10 agencies, and send a live referral request. Agencies will see it in
              their referral inbox and can turn it into an offer.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <CardInset className="p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                <Ticket className="size-3.5" />
                Open plans
              </div>
              <p className="mt-2 font-display text-2xl text-[var(--color-ink-950)]">{openPlans.length}</p>
            </CardInset>
            <CardInset className="p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                <Handshake className="size-3.5" />
                Agencies picked
              </div>
              <p className="mt-2 font-display text-2xl text-[var(--color-ink-950)]">{selectedAgencyIds.length}</p>
            </CardInset>
            <CardInset className="p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                <Sparkles className="size-3.5" />
                Earning status
              </div>
              <p className="mt-2 text-sm font-medium text-[var(--color-ink-700)]">Referral sending is live now.</p>
            </CardInset>
          </div>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                  Invite travelers
                </p>
                <h2 className="font-display text-lg text-[var(--color-ink-950)]">Your referral code</h2>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGenerateInviteLink}
                disabled={!token}
              >
                <RefreshCcw className="size-4" />
                Generate
              </Button>
            </div>

            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4">
              <p className="text-xs text-[var(--color-ink-600)]">Code</p>
              <p className="mt-1 font-display text-2xl tracking-wide text-[var(--color-ink-950)]">
                {inviteLink?.code ?? "------"}
              </p>
              <p className="mt-2 text-xs text-[var(--color-ink-500)]">
                Expires {inviteLink?.expiresAt ? new Date(inviteLink.expiresAt).toLocaleDateString() : "in 90 days"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={handleCopyInviteLink} disabled={!inviteLink?.shareUrl}>
                  <Copy className="size-4" />
                  Copy link
                </Button>
                {inviteLink?.shareUrl ? (
                  <a
                    href={inviteLink.shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-xs font-semibold text-[var(--color-ink-700)] hover:bg-[var(--color-surface-2)]"
                  >
                    <Link2 className="size-3.5" />
                    Open link
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                Live referrals
              </p>
              <h2 className="font-display text-lg text-[var(--color-ink-950)]">Status & earnings</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <CardInset className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Sent</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-ink-950)]">
                  {referralStats?.sentReferrals ?? 0}
                </p>
              </CardInset>
              <CardInset className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Completed</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-ink-950)]">
                  {referralStats?.sentCompleted ?? 0}
                </p>
              </CardInset>
              <CardInset className="p-3">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-ink-500)]">Earned</p>
                <p className="mt-1 text-xl font-semibold text-[var(--color-sea-700)]">
                  ₹{(referralStats?.totalEarned ?? 0).toLocaleString("en-IN")}
                </p>
              </CardInset>
            </div>
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
              {isReferralLoading ? (
                <div className="space-y-2 p-4">
                  <div className="h-8 animate-pulse rounded bg-[var(--color-surface-2)]" />
                  <div className="h-8 animate-pulse rounded bg-[var(--color-surface-2)]" />
                </div>
              ) : myReferrals.length === 0 ? (
                <p className="p-4 text-sm text-[var(--color-ink-500)]">No referrals yet.</p>
              ) : (
                <div className="divide-y divide-[var(--color-border)]">
                  {myReferrals.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium text-[var(--color-ink-900)]">
                          {item.referredUser?.fullName || item.referredUser?.email || "New invite"}
                        </p>
                        <p className="text-xs text-[var(--color-ink-500)]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={item.status === "COMPLETED" ? "sea" : "outline"}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
          <div className="animate-pulse-soft text-center">
            <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
            <p className="text-sm">Loading your plans and agencies...</p>
          </div>
        </Card>
      ) : openPlans.length === 0 ? (
        <EmptyState
          title="No open plans to refer yet"
          description="Publish a plan first. Once your plan is OPEN, you can push it to agencies from here."
          action={
            <Link href="/dashboard/plans/new">
              <Button>Create a plan</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-5 p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="font-display text-lg text-[var(--color-ink-950)]">1. Pick a live plan</h2>
              <p className="text-sm text-[var(--color-ink-600)]">
                Only plans in `OPEN` status can be referred to agencies.
              </p>
            </div>

            <div className="space-y-3">
              {openPlans.map((plan) => {
                const isActive = plan.id === selectedPlanId;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setFeedback(null);
                    }}
                    className={`w-full rounded-[var(--radius-lg)] border p-4 text-left transition ${
                      isActive
                        ? "border-[var(--color-sea-200)] bg-[var(--color-sea-50)] shadow-[var(--shadow-md)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-sea-100)] hover:shadow-[var(--shadow-sm)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="sea">{plan.status}</Badge>
                          <span className="text-xs text-[var(--color-ink-500)]">
                            {plan._count?.offers ?? 0} existing offers
                          </span>
                        </div>
                        <h3 className="mt-2 font-display text-base text-[var(--color-ink-950)]">{plan.title}</h3>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-ink-600)]">
                          <MapPin className="size-3.5" />
                          {plan.destination}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-[var(--color-ink-600)]">
                      {formatDateRange(plan.startDate, plan.endDate)}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-5 p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="font-display text-lg text-[var(--color-ink-950)]">2. Select agencies</h2>
              <p className="text-sm text-[var(--color-ink-600)]">
                Search by name, city, specialization, or destination. You can refer to up to 10 agencies at once.
              </p>
            </div>

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search agencies for referrals"
              placeholder="Search agencies, destinations, specializations..."
            />

            <div className="grid gap-3 md:grid-cols-2">
              {filteredAgencies.map((agency) => {
                const isSelected = selectedAgencyIds.includes(agency.id);
                return (
                  <button
                    key={agency.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleAgency(agency.id)}
                    className={`rounded-[var(--radius-lg)] border p-4 text-left transition ${
                      isSelected
                        ? "border-[var(--color-sea-200)] bg-[var(--color-sea-50)] shadow-[var(--shadow-md)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)] hover:border-[var(--color-sea-100)] hover:shadow-[var(--shadow-sm)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-base text-[var(--color-ink-950)]">{agency.name}</h3>
                        <p className="mt-1 text-sm text-[var(--color-ink-600)]">
                          {[agency.city, agency.state].filter(Boolean).join(", ") || "Pan-India"}
                        </p>
                      </div>
                      <AgencyVerificationBadge status={agency.verification ?? "pending"} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(agency.specializations ?? []).slice(0, 2).map((item) => (
                        <Badge key={item} variant="outline">
                          {item}
                        </Badge>
                      ))}
                      {(agency.destinations ?? []).slice(0, 2).map((item) => (
                        <Badge key={item} variant="sea">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredAgencies.length === 0 ? (
              <EmptyState
                title="No agencies match your search"
                description="Try a broader destination, city, or specialization keyword."
              />
            ) : null}

            {feedback ? (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
                {feedback}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
              <p className="text-sm text-[var(--color-ink-600)]">
                {selectedPlan ? (
                  <>
                    Sending <span className="font-semibold text-[var(--color-ink-900)]">{selectedPlan.title}</span>{" "}
                    to <span className="font-semibold text-[var(--color-ink-900)]">{selectedAgencyIds.length}</span>{" "}
                    agencies.
                  </>
                ) : (
                  "Choose a plan and at least one agency to send referrals."
                )}
              </p>

              <Button
                type="button"
                disabled={!selectedPlanId || selectedAgencyIds.length === 0 || isPending}
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await apiFetchWithAuth(`/plans/${selectedPlanId}/refer`, {
                        method: "POST",
                        body: JSON.stringify({ agencyIds: selectedAgencyIds }),
                      });
                      setFeedback(`Referral sent to ${selectedAgencyIds.length} agencies.`);
                      setSelectedAgencyIds([]);
                    } catch (error) {
                      setFeedback(error instanceof Error ? error.message : "Unable to send referrals.");
                    }
                  })
                }
              >
                <Send className="size-4" />
                {isPending ? "Sending..." : "Send referrals"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
