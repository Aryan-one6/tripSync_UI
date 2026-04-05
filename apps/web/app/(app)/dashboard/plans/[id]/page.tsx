"use client";

import { use, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/lib/auth/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { MapPin, CheckCircle2, UserMinus } from "lucide-react";
import type { PlanDetails, GroupMember, UserSummary } from "@/lib/api/types";

export default function ManagePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { apiFetchWithAuth } = useAuth();
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<UserSummary[]>([]);
  const [searchingInvites, setSearchingInvites] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const data = await apiFetchWithAuth<PlanDetails>(`/plans/${resolvedParams.id}`);
        setPlan(data);
      } catch (err: any) {
        setError(err.message || "Failed to load plan");
      } finally {
        setLoading(false);
      }
    })();
  }, [resolvedParams.id, apiFetchWithAuth]);

  useEffect(() => {
    const query = inviteQuery.trim();
    if (!plan?.group?.id || query.length < 2) {
      setInviteResults([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          setSearchingInvites(true);
          const users = await apiFetchWithAuth<UserSummary[]>(
            `/users/search?q=${encodeURIComponent(query)}`,
          );
          if (!cancelled) setInviteResults(users);
        } catch {
          if (!cancelled) setInviteResults([]);
        } finally {
          if (!cancelled) setSearchingInvites(false);
        }
      })();
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [apiFetchWithAuth, inviteQuery, plan?.group?.id]);

  const handleApprove = async (userId: string) => {
    if (!plan?.group?.id) return;
    try {
      await apiFetchWithAuth(`/groups/${plan.group.id}/approve/${userId}`, { method: "POST" });
      setPlan((prev) => {
        if (!prev || !prev.group || !prev.group.members) return prev;
        const newMembers = prev.group.members.map((m: GroupMember) => 
          m.user.id === userId ? { ...m, status: "APPROVED" as const } : m
        );
        return { ...prev, group: { ...prev.group, members: newMembers } };
      });
    } catch (err: any) {
      alert("Failed to approve user: " + err.message);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!plan?.group?.id) return;
    const confirmRemove = confirm("Are you sure you want to decline/remove this traveler?");
    if (!confirmRemove) return;
    try {
      await apiFetchWithAuth(`/groups/${plan.group.id}/remove/${userId}`, { method: "POST" });
      setPlan((prev) => {
        if (!prev || !prev.group || !prev.group.members) return prev;
        const newMembers = prev.group.members.filter((m: GroupMember) => m.user.id !== userId);
        return { ...prev, group: { ...prev.group, members: newMembers } };
      });
    } catch (err: any) {
      alert("Failed to remove user: " + err.message);
    }
  };

  const handleInvite = async (targetUser: UserSummary) => {
    if (!plan?.group?.id) return;
    try {
      setInvitingUserId(targetUser.id);
      setInviteFeedback(null);
      await apiFetchWithAuth(`/groups/${plan.group.id}/invite`, {
        method: "POST",
        body: JSON.stringify({ userId: targetUser.id }),
      });
      const refreshed = await apiFetchWithAuth<PlanDetails>(`/plans/${resolvedParams.id}`);
      setPlan(refreshed);
      setInviteFeedback(`${targetUser.fullName} was added to this trip.`);
    } catch (err: any) {
      setInviteFeedback(err.message || "Unable to invite this traveler right now.");
    } finally {
      setInvitingUserId(null);
    }
  };

  if (loading) {
    return (
      <DashboardShell variant="user" title="Manage plan" subtitle="Loading plan details...">
        <Card className="flex items-center justify-center p-12 text-[var(--color-ink-500)]">
           <div className="animate-pulse-soft text-center">
             <div className="mx-auto mb-3 size-10 rounded-full bg-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]" />
             <p className="text-sm">Loading members...</p>
           </div>
        </Card>
      </DashboardShell>
    );
  }

  if (error || !plan) {
    return (
      <DashboardShell variant="user" title="Manage plan" subtitle="Error loading plan">
        <EmptyState title="Not found" description={error || "Plan not found"} />
      </DashboardShell>
    );
  }

  const members = plan.group?.members || [];
  const activeMembersCount = members.filter((m) => m.status === "APPROVED" || m.status === "COMMITTED").length;
  const activeMemberIds = new Set(
    members
      .filter((m) => m.status === "INTERESTED" || m.status === "APPROVED" || m.status === "COMMITTED")
      .map((m) => m.user.id),
  );

  return (
    <DashboardShell
      variant="user"
      title={`Manage: ${plan.title}`}
      subtitle="Approve interested travelers and manage your group membership."
    >
      <div className="space-y-6">
        <Card className="p-5">
          <div className="flex flex-col gap-4">
            <div>
              <Badge variant={plan.status === "OPEN" ? "sea" : plan.status === "CONFIRMED" ? "lavender" : "default"}>
                 {plan.status}
              </Badge>
              <h2 className="mt-2 font-display text-xl text-[var(--color-ink-950)]">{plan.title}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                <MapPin className="size-4" />
                {plan.destination}
              </div>
            </div>
            
            <CardInset className="flex flex-col sm:flex-row gap-4 p-4 items-center justify-between">
               <div className="text-sm text-[var(--color-ink-700)]">
                 <strong>{activeMembersCount}</strong> / {plan.groupSizeMax} approved travelers
               </div>
               {plan.autoApprove && (
                 <Badge variant="sea">Auto-approval ON</Badge>
               )}
            </CardInset>
          </div>
        </Card>

        <Card className="p-5">
          <div className="space-y-3">
            <div>
              <h3 className="font-display text-lg text-[var(--color-ink-950)]">Add traveler</h3>
              <p className="text-sm text-[var(--color-ink-600)]">
                Search a user and add them directly to your plan group.
              </p>
            </div>
            <Input
              value={inviteQuery}
              onChange={(event) => setInviteQuery(event.target.value)}
              placeholder="Search by full name or username"
            />
            {inviteFeedback && (
              <div className="rounded-[var(--radius-md)] bg-[var(--color-sea-50)] px-3 py-2 text-sm text-[var(--color-sea-700)]">
                {inviteFeedback}
              </div>
            )}
            {inviteQuery.trim().length >= 2 && (
              <div className="space-y-2">
                {searchingInvites ? (
                  <p className="text-sm text-[var(--color-ink-500)]">Searching travelers…</p>
                ) : inviteResults.length === 0 ? (
                  <p className="text-sm text-[var(--color-ink-500)]">No matching users found.</p>
                ) : (
                  inviteResults.map((user) => {
                    const alreadyAdded = activeMemberIds.has(user.id);
                    const isCreator = user.id === plan.creator.id;
                    return (
                      <div
                        key={user.id}
                        className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">{user.fullName}</p>
                          <p className="truncate text-xs text-[var(--color-ink-500)]">
                            {user.username ? `@${user.username}` : "No username"}
                            {user.city ? ` • ${user.city}` : ""}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={alreadyAdded || isCreator ? "secondary" : "primary"}
                          disabled={alreadyAdded || isCreator || invitingUserId === user.id}
                          onClick={() => void handleInvite(user)}
                        >
                          {isCreator
                            ? "Creator"
                            : alreadyAdded
                            ? "Already added"
                            : invitingUserId === user.id
                            ? "Adding..."
                            : "Add"}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </Card>

        <div>
           <h3 className="mb-4 font-display text-lg text-[var(--color-ink-950)]">Travelers</h3>
           {members.length === 0 ? (
             <EmptyState title="No travelers yet" description="Wait for people to discover and join your trip." />
           ) : (
             <div className="space-y-3">
               {members.map((member) => {
                 const isCreator = member.role === "CREATOR";
                 const isInterested = member.status === "INTERESTED";
                 
                 return (
                   <Card key={member.id} className="p-4 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={member.user.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${member.user.fullName}`}
                          alt={member.user.fullName}
                          className="size-10 rounded-full border border-[var(--color-border)] shadow-sm object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[var(--color-ink-950)]">{member.user.fullName}</span>
                            {isCreator && <Badge variant="lavender" className="scale-90">CREATOR</Badge>}
                            {!isCreator && member.status !== "INTERESTED" && (
                              <Badge variant="sea" className="scale-90">{member.status}</Badge>
                            )}
                            {isInterested && (
                              <Badge variant="sunset" className="scale-90">REQUESTED</Badge>
                            )}
                          </div>
                          <p className="text-xs text-[var(--color-ink-500)] mt-0.5">
                            {member.user.gender} • {member.user.city || "Unknown city"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-2 sm:mt-0">
                        {isInterested && !isCreator && (
                          <Button size="sm" onClick={() => handleApprove(member.user.id)} className="flex-1 sm:flex-none">
                            <CheckCircle2 className="size-4" />
                            Approve
                          </Button>
                        )}
                        {!isCreator && (
                          <Button size="sm" variant="soft" onClick={() => handleRemove(member.user.id)} className="flex-1 sm:flex-none">
                            <UserMinus className="size-4" />
                            {isInterested ? "Decline" : "Remove"}
                          </Button>
                        )}
                      </div>
                   </Card>
                 );
               })}
             </div>
           )}
        </div>
      </div>
    </DashboardShell>
  );
}
