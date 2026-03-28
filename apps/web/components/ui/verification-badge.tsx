import { BadgeCheck, Clock3, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AgencyVerificationStatus, VerificationTier } from "@/lib/api/types";

export function UserVerificationBadge({
  tier,
}: {
  tier?: VerificationTier | null;
}) {
  if (!tier || tier === "BASIC") {
    return (
      <Badge variant="default" className="gap-1.5 shadow-[var(--shadow-clay-sm)]">
        Basic profile
      </Badge>
    );
  }

  if (tier === "TRUSTED") {
    return (
      <Badge variant="sea" className="gap-1.5 bg-[var(--color-sea-700)] text-white shadow-[var(--shadow-clay-sm)]">
        <ShieldCheck className="size-3.5" />
        Trusted traveler
      </Badge>
    );
  }

  return (
    <Badge variant="sea" className="gap-1.5 shadow-[var(--shadow-clay-sm)]">
      <BadgeCheck className="size-3.5" />
      Verified traveler
    </Badge>
  );
}

export function AgencyVerificationBadge({
  status,
}: {
  status?: AgencyVerificationStatus | string | null;
}) {
  if (!status || status === "pending") {
    return (
      <Badge variant="default" className="gap-1.5 shadow-[var(--shadow-clay-sm)]">
        <Clock3 className="size-3.5" />
        Agency pending
      </Badge>
    );
  }

  if (status === "verified") {
    return (
      <Badge variant="sea" className="gap-1.5 bg-[var(--color-sea-700)] text-white shadow-[var(--shadow-clay-sm)]">
        <BadgeCheck className="size-3.5" />
        Verified agency
      </Badge>
    );
  }

  return (
    <Badge variant="sunset" className="gap-1.5 shadow-[var(--shadow-clay-sm)]">
      <Clock3 className="size-3.5" />
      Under review
    </Badge>
  );
}
