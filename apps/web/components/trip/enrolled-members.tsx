import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, BadgeCheck, Star, MapPin } from "lucide-react";
import type { GroupMember } from "@/lib/api/types";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface EnrolledMembersProps {
  members: GroupMember[];
  maxSize: number;
  currentSize: number;
  maleCount?: number;
  femaleCount?: number;
  otherCount?: number;
}

function VerificationIcon({ tier }: { tier?: string | null }) {
  if (tier === "TRUSTED") return <ShieldCheck className="size-3 text-[var(--color-sea-700)]" />;
  if (tier === "VERIFIED") return <BadgeCheck className="size-3 text-[var(--color-sea-600)]" />;
  return null;
}

function MemberCard({ member }: { member: GroupMember }) {
  const user = member.user;
  const profileHref = user.username ? `/profile/${user.username}` : null;
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-white/40 bg-[var(--color-surface-2)] px-3 py-2.5 shadow-[var(--shadow-clay-inset)] transition hover:shadow-[var(--shadow-clay-sm)] sm:items-center">
      {/* Avatar */}
      <div className="relative">
        <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-xs font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.fullName}
              width={40}
              height={40}
              className="size-full rounded-full object-cover"
            />
          ) : (
            initials(user.fullName)
          )}
        </div>
        {/* Online-ish indicator for committed members */}
        {member.status === "COMMITTED" && (
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[var(--color-surface-2)] bg-[var(--color-sea-400)]" />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {profileHref ? (
            <Link href={profileHref} className="truncate text-sm font-semibold text-[var(--color-ink-900)] transition hover:text-[var(--color-sea-700)]">
              {user.fullName}
            </Link>
          ) : (
            <p className="truncate text-sm font-semibold text-[var(--color-ink-900)]">
              {user.fullName}
            </p>
          )}
          <VerificationIcon tier={user.verification} />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[var(--color-ink-500)]">
          {user.city && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="size-2.5" />
              {user.city}
            </span>
          )}
          {(user.completedTrips ?? 0) > 0 && (
            <span>{user.completedTrips} trips</span>
          )}
          {(user.avgRating ?? 0) > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-2.5 fill-current text-[var(--color-sunset-400)]" />
              {user.avgRating?.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <span
        className={cn(
          "mt-1 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:mt-0",
          member.status === "COMMITTED" &&
            "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]",
          member.status === "APPROVED" &&
            "bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)]",
          member.status === "INTERESTED" &&
            "bg-[var(--color-sand-100)] text-[var(--color-ink-600)]",
        )}
      >
        {member.status === "COMMITTED"
          ? "Confirmed"
          : member.status === "APPROVED"
            ? "Approved"
            : "Interested"}
      </span>
    </div>
  );
}

export function EnrolledMembers({
  members,
  maxSize,
  currentSize,
  maleCount = 0,
  femaleCount = 0,
  otherCount = 0,
}: EnrolledMembersProps) {
  const visibleMembers = members.filter(
    (m) => m.status !== "LEFT" && m.status !== "REMOVED",
  );
  const committed = visibleMembers.filter((m) => m.status === "COMMITTED");
  const others = visibleMembers.filter((m) => m.status !== "COMMITTED");
  const fillPercentage = Math.min((currentSize / maxSize) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Fill bar */}
      <div>
        <div className="flex items-end justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
            Group fill
          </p>
          <p className="text-sm font-semibold text-[var(--color-ink-800)]">
            {currentSize}/{maxSize}
          </p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-inset)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)] transition-all duration-700"
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
        {/* Gender breakdown */}
        {(maleCount + femaleCount + otherCount) > 0 && (
          <div className="mt-1.5 flex gap-3 text-[10px] text-[var(--color-ink-500)]">
            {maleCount > 0 && <span>{maleCount} male</span>}
            {femaleCount > 0 && <span>{femaleCount} female</span>}
            {otherCount > 0 && <span>{otherCount} other</span>}
          </div>
        )}
      </div>

      {/* Spots remaining callout */}
      {maxSize - currentSize > 0 && maxSize - currentSize <= 5 && (
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-sunset-50)] px-3 py-2 text-center text-xs font-semibold text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
          Only {maxSize - currentSize} spot{maxSize - currentSize > 1 ? "s" : ""} left!
        </div>
      )}

      {/* Member list */}
      {visibleMembers.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
            Travelers ({visibleMembers.length})
          </p>
          {[...committed, ...others].map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-4 text-center shadow-[var(--shadow-clay-inset)]">
          <p className="text-sm text-[var(--color-ink-500)]">
            Be the first to join this trip!
          </p>
        </div>
      )}
    </div>
  );
}
