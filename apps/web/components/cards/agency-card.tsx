import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AgencyVerificationBadge } from "@/components/ui/verification-badge";
import { WhatsAppShareButton } from "@/components/ui/whatsapp-share-button";
import type { AgencySummary } from "@/lib/api/types";
import { initials } from "@/lib/format";
import { buildWhatsAppShareHref } from "@/lib/share";

export function AgencyCard({ agency }: { agency: AgencySummary }) {
  const href = `/profile/${agency.slug}`;
  const shareHref = buildWhatsAppShareHref(`Explore this TravellersIn agency: ${agency.name}`, href);

  return (
    <Card className="group h-full p-0 overflow-hidden hover:shadow-[var(--shadow-clay-lg)] hover:-translate-y-1">
      <Link href={href} className="block p-4 sm:p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex size-14 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] font-display text-lg text-[var(--color-sea-700)] shadow-[var(--shadow-clay)]">
            {initials(agency.name)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg text-[var(--color-ink-950)] line-clamp-1">{agency.name}</h3>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-sunset-50)] px-2 py-1 text-xs font-bold text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
                <Star className="size-3 fill-current" />
                {agency.avgRating.toFixed(1)}
              </span>
            </div>

            <div className="mt-1.5">
              <AgencyVerificationBadge status={agency.verification} />
            </div>

            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-ink-600)]">
              <MapPin className="size-3.5" />
              <span>
                {agency.city ?? "Anywhere"}
                {agency.state ? `, ${agency.state}` : ""}
              </span>
            </div>
          </div>
        </div>

        {agency.description && (
          <p className="mt-4 line-clamp-2 text-sm text-[var(--color-ink-600)] leading-relaxed">
            {agency.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {(agency.specializations ?? []).slice(0, 3).map((spec) => (
            <Badge key={spec} variant="lavender">{spec}</Badge>
          ))}
        </div>
      </Link>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] px-4 py-3 sm:px-5">
        <Link
          href={href}
          className="text-sm font-semibold text-[var(--color-sea-700)] transition hover:text-[var(--color-sea-500)]"
        >
          View agency
        </Link>
        <WhatsAppShareButton href={shareHref} label="Share" size="sm" />
      </div>
    </Card>
  );
}
