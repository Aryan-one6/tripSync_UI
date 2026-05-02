"use client";

import { useRouter } from "next/navigation";
import { Calendar, Users, MessageCircle, CreditCard, Share2, ChevronRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WhatsAppShareButton } from "@/components/ui/whatsapp-share-button";
import { PlanPrimaryAction } from "@/components/trip/plan-primary-action";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateRange } from "@/lib/format";
import type { GroupMember, Offer } from "@/lib/api/types";

interface BookingSidebarProps {
  groupId?: string;
  planId?: string;
  planTitle?: string;
  destination?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  creatorUserId?: string;
  offers?: Offer[];
  price: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  groupSizeMax: number;
  currentSize: number;
  spotsLeft: number;
  shareUrl: string;
  requiresFemaleProfile?: boolean;
  departureDates?: string[] | null;
  label?: string;
  members?: GroupMember[];
  compact?: boolean;
  showQuickActions?: boolean;
}

export function BookingSidebar({
  groupId,
  planId,
  planTitle,
  destination,
  budgetMin,
  budgetMax,
  creatorUserId,
  offers = [],
  price,
  startDate,
  endDate,
  groupSizeMax,
  currentSize,
  spotsLeft,
  shareUrl,
  requiresFemaleProfile = false,
  departureDates,
  label = "Enroll Now",
  members = [],
  compact = false,
  showQuickActions,
}: BookingSidebarProps) {
  const { session } = useAuth();
  const router = useRouter();
  const isLoggedIn = !!session;
  const isAgency = session?.role === "agency_admin";

  // Determine if current user is already a member
  const isMember = isLoggedIn && members.some(
    (m) => m.user.id === session.user.id && m.status !== "LEFT" && m.status !== "REMOVED"
  );
  const memberEntry = members.find((m) => m.user.id === session?.user.id);
  const memberStatus = memberEntry?.status ?? null;
  const memberRole = memberEntry?.role ?? null;
  const isApproved = memberStatus === "APPROVED" || memberStatus === "COMMITTED" || memberRole === "CREATOR";

  const chatHref = groupId
    ? `/dashboard/messages?groupId=${encodeURIComponent(groupId)}`
    : "/dashboard/messages";

  const checkoutHref = groupId
    ? `/dashboard/groups/${groupId}/checkout`
    : "#";

  const spotsLeftPct = Math.round(((groupSizeMax - currentSize) / groupSizeMax) * 100);
  const isFull = currentSize >= groupSizeMax;

  return (
    <div className="space-y-3">
      {/* ── Trip info strip ── */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Calendar className="size-3.5 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Dates</p>
            <p className="text-xs font-semibold text-slate-800 leading-tight mt-0.5 truncate">
              {formatDateRange(startDate, endDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <Users className="size-3.5 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Group</p>
            <p className="text-xs font-semibold text-slate-800 mt-0.5">
              {currentSize}/{groupSizeMax}
              {spotsLeft > 0 && spotsLeft <= 5 && (
                <span className="ml-1 text-orange-500">· {spotsLeft} left</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Spots progress bar ── */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Spots Filled</span>
          <span className="text-[10px] font-bold text-slate-600">{100 - spotsLeftPct}%</span>
        </div>
        <div className="h-1 w-full rounded-full bg-slate-100">
          <div
            className="h-1 rounded-full bg-slate-800 transition-all"
            style={{ width: `${Math.min(100, 100 - spotsLeftPct)}%` }}
          />
        </div>
      </div>

      {/* ── Available batches ── */}
      {departureDates && departureDates.length > 1 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Available Batches</p>
          <div className="flex flex-wrap gap-1.5">
            {departureDates.slice(0, 4).map((date) => (
              <span key={date} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            ))}
            {departureDates.length > 4 && (
              <span className="text-xs text-slate-400 px-2 py-1">+{departureDates.length - 4} more</span>
            )}
          </div>
        </div>
      )}

      {/* ── CTAs ── */}
      {!isAgency ? (
        <div className="space-y-2">
          {/* Approved: full-width Pay & Confirm + chat */}
          {isApproved ? (
            <>
              <button
                type="button"
                className="w-full h-12 rounded-xl bg-slate-900 text-sm font-bold tracking-wide text-white transition hover:bg-slate-800 flex items-center justify-center gap-2"
                onClick={() => router.push(checkoutHref)}
              >
                <CreditCard className="size-4" />
                Enroll Now
              </button>
              {groupId && (
                <button
                  type="button"
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  onClick={() => router.push(chatHref)}
                >
                  <MessageCircle className="size-4" />
                  Group Chat
                </button>
              )}
            </>
          ) : isMember && groupId ? (
            /* Pending: chat only */
            <>
              <button
                type="button"
                className="w-full h-11 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2"
                onClick={() => router.push(chatHref)}
              >
                <MessageCircle className="size-4" />
                Group Chat
              </button>
              <p className="text-center text-xs text-slate-400">
                Your join request is pending approval.
              </p>
            </>
          ) : (
            /* Not a member: Enroll Now (dark) + Group Chat + WhatsApp */
            <>
              <PlanPrimaryAction
                groupId={groupId}
                joinLabel={isFull ? "Group Full" : label}
                requiresFemaleProfile={requiresFemaleProfile}
                members={members}
                planId={planId}
                planTitle={planTitle}
                destination={destination}
                budgetMin={budgetMin}
                budgetMax={budgetMax}
                creatorUserId={creatorUserId}
                offers={offers}
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="h-10 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-2"
                  onClick={() => {
                    if (!isLoggedIn) {
                      router.push(`/login?next=${encodeURIComponent(chatHref)}`);
                      return;
                    }
                    router.push(chatHref);
                  }}
                >
                  <MessageCircle className="size-4" />
                  Group Chat
                </button>
                <WhatsAppShareButton href={shareUrl} label="Share" size="sm" className="h-10 w-full" />
              </div>
              {!isLoggedIn && (
                <p className="text-center text-xs text-slate-400">
                  Please <a href="/login" className="font-semibold text-emerald-600 hover:underline">log in</a> to continue
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <PlanPrimaryAction
          groupId={groupId}
          joinLabel={label}
          requiresFemaleProfile={requiresFemaleProfile}
          members={members}
          planId={planId}
          planTitle={planTitle}
          destination={destination}
          budgetMin={budgetMin}
          budgetMax={budgetMax}
          creatorUserId={creatorUserId}
          offers={offers}
        />
      )}

      {/* ── Trust note ── */}
      <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
        <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-emerald-500" />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Payments are held in <strong className="text-slate-700">secure escrow</strong> via Razorpay and released to the agency only after trip milestones are met.
        </p>
      </div>
    </div>
  );
}
