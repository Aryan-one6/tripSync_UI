"use client";

import { use, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { useAuth } from "@/lib/auth/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MapPin, CheckCircle2, UserMinus } from "lucide-react";
import type { PlanDetails, GroupMember } from "@/lib/api/types";

export default function ManagePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { apiFetchWithAuth } = useAuth();
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
