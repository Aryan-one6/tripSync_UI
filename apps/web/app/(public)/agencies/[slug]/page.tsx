import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Star, CalendarRange, Package } from "lucide-react";
import { Card, CardInset } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { AgencyVerificationBadge } from "@/components/ui/verification-badge";
import { WhatsAppShareButton } from "@/components/ui/whatsapp-share-button";
import { getAgencyBySlug } from "@/lib/api/public";
import { formatCompactDate, formatCurrency, initials } from "@/lib/format";
import { buildAbsoluteUrl, buildWhatsAppShareHref, compactDescription } from "@/lib/share";

export const dynamic = "force-dynamic";

async function loadAgency(slug: string) {
  return getAgencyBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const agency = await loadAgency(slug);

  if (!agency) {
    return {
      title: "Agency not found",
      description: "This TripSync agency profile is unavailable.",
    };
  }

  const description = compactDescription(
    agency.description ?? "",
    `${agency.name} operates trips around ${agency.destinations?.slice(0, 3).join(", ") || agency.city || "India"}.`,
  );
  const url = buildAbsoluteUrl(`/agencies/${agency.slug}`);

  return {
    title: agency.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: agency.name,
      description,
      url,
      type: "profile",
      images: agency.logoUrl ? [{ url: agency.logoUrl }] : undefined,
    },
    twitter: {
      card: agency.logoUrl ? "summary_large_image" : "summary",
      title: agency.name,
      description,
      images: agency.logoUrl ? [agency.logoUrl] : undefined,
    },
  };
}

export default async function AgencyProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const agency = await loadAgency(slug);

  if (!agency) {
    return (
      <div className="page-shell py-12">
        <EmptyState
          title="Agency not found"
          description="The agency profile is unavailable or the slug is incorrect."
        />
      </div>
    );
  }

  const shareUrl = buildWhatsAppShareHref(`Explore this TripSync agency: ${agency.name}`, `/agencies/${agency.slug}`);

  return (
    <div className="page-shell space-y-8 py-10">
      {/* Profile header */}
      <Card className="relative overflow-hidden p-6 sm:p-8">
        <div className="clay-blob -top-12 -right-12 size-32 bg-[var(--color-sea-200)] opacity-10 animate-blob" />
        <div className="clay-blob -bottom-8 -left-8 size-20 bg-[var(--color-sand-200)] opacity-8 animate-blob delay-300" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-5">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] font-display text-xl text-[var(--color-sea-800)] shadow-[var(--shadow-clay)] sm:size-20 sm:text-2xl">
              {initials(agency.name)}
            </div>
            <div>
              <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                Agency profile
              </span>
              <h1 className="mt-2 font-display text-2xl text-[var(--color-ink-950)] sm:text-3xl md:text-4xl">{agency.name}</h1>
              <div className="mt-2">
                <AgencyVerificationBadge status={agency.verification} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[var(--color-ink-600)]">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {agency.city ?? "India"}{agency.state ? `, ${agency.state}` : ""}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-3.5 fill-current text-[var(--color-sunset-500)]" />
                  {agency.avgRating.toFixed(1)} average
                </span>
              </div>
            </div>
          </div>

          {/* Stats box */}
          <div className="shrink-0 rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] px-5 py-4 text-right shadow-[var(--shadow-clay-inset)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">TripSync snapshot</p>
            <p className="mt-2 font-display text-2xl text-[var(--color-ink-950)]">
              {agency.totalTrips ?? 0} trips
            </p>
            <p className="text-sm text-[var(--color-ink-600)]">{agency.totalReviews ?? 0} public reviews</p>
            <div className="mt-3">
              <WhatsAppShareButton href={shareUrl} label="Share agency" size="sm" />
            </div>
          </div>
        </div>

        {agency.description && (
          <p className="mt-6 max-w-3xl text-sm text-[var(--color-ink-600)] leading-relaxed">{agency.description}</p>
        )}
      </Card>

      {/* Open packages */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
            <Package className="size-5" />
          </div>
          <h2 className="font-display text-xl text-[var(--color-ink-950)]">Open packages</h2>
        </div>
        {agency.packages.length === 0 ? (
          <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
            No packages available at this time.
          </CardInset>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {agency.packages.map((pkg) => (
              <Link key={pkg.id} href={`/packages/${pkg.slug}`}>
                <Card className="h-full space-y-3 p-5 transition-all hover:shadow-[var(--shadow-clay-lg)] hover:-translate-y-0.5">
                  <h3 className="font-display text-lg text-[var(--color-ink-950)]">{pkg.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                    <MapPin className="size-3.5" />
                    {pkg.destination}
                  </div>
                  <p className="font-display text-xl text-[var(--color-sea-700)]">{formatCurrency(pkg.basePrice)}</p>
                  <div className="flex items-center gap-2 text-xs text-[var(--color-ink-500)]">
                    <CalendarRange className="size-3" />
                    {formatCompactDate(pkg.startDate)} – {formatCompactDate(pkg.endDate)}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Reviews */}
      <section className="space-y-5 pb-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
            <Star className="size-5" />
          </div>
          <h2 className="font-display text-xl text-[var(--color-ink-950)]">Recent reviews</h2>
        </div>
        {agency.reviewsReceived.length === 0 ? (
          <CardInset className="p-6 text-center text-sm text-[var(--color-ink-500)]">
            No reviews yet.
          </CardInset>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {agency.reviewsReceived.map((review) => (
              <Card key={review.id} className="space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`size-4 ${i < review.overallRating ? "fill-[var(--color-sunset-400)] text-[var(--color-sunset-500)]" : "text-[var(--color-ink-300)]"}`}
                      />
                    ))}
                  </div>
                  <Badge variant="sea">{review.overallRating}/5</Badge>
                </div>
                <p className="text-sm text-[var(--color-ink-600)] leading-relaxed">
                  {review.comment || "No comment shared."}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[10px] font-bold text-[var(--color-sea-700)]">
                    {initials(review.reviewer.fullName)}
                  </div>
                  <p className="text-xs text-[var(--color-ink-500)]">
                    {review.reviewer.fullName} · {formatCompactDate(review.createdAt)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
