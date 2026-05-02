import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin,
  CalendarRange,
  Users,
  Star,
  Clock,
  Tent,
  Route,
  Compass,
  DollarSign,
  CheckCircle2,
  Car,
  Coffee,
  Eye,
  Ticket,
} from "lucide-react";
import { ImageGallery } from "@/components/trip/image-gallery";
import { DayStepper, type DayPlan } from "@/components/trip/day-stepper";
import { TripTabs } from "@/components/trip/trip-tabs";
import { InclusionsCard } from "@/components/trip/inclusions-card";
import { PricingTable } from "@/components/trip/pricing-table";
import { EnrolledMembers } from "@/components/trip/enrolled-members";
import { BookingSidebar } from "@/components/trip/booking-sidebar";
import { ReviewsSection } from "@/components/trip/reviews-section";
import { CancellationPolicy } from "@/components/trip/cancellation-policy";
import { AgencyVerificationBadge } from "@/components/ui/verification-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardInset } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getPackageBySlug, getAgencyBySlug } from "@/lib/api/public";
import {
  formatCompactDate,
  formatCurrency,
  formatDateRange,
  formatDurationLabel,
  formatVibes,
  initials,
} from "@/lib/format";
import { buildAbsoluteUrl, buildWhatsAppShareHref, compactDescription } from "@/lib/share";

export const dynamic = "force-dynamic";

async function loadPackage(slug: string) {
  return getPackageBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pkg = await loadPackage(id);

  if (!pkg) {
    return {
      title: "Package not found",
      description: "This agency package is unavailable.",
    };
  }

  const description = compactDescription(
    `${pkg.title} by ${pkg.agency.name}. ${pkg.destination}.`,
    `${pkg.title} by ${pkg.agency.name} for ${pkg.groupSizeMin}-${pkg.groupSizeMax} travelers.`,
  );
  const url = buildAbsoluteUrl(`/packages/${pkg.slug}`);

  return {
    title: pkg.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: pkg.title,
      description,
      url,
      type: "article",
      images: pkg.galleryUrls?.[0] ? [{ url: pkg.galleryUrls[0] }] : undefined,
    },
    twitter: {
      card: pkg.galleryUrls?.[0] ? "summary_large_image" : "summary",
      title: pkg.title,
      description,
      images: pkg.galleryUrls?.[0] ? [pkg.galleryUrls[0]] : undefined,
    },
  };
}


export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await loadPackage(id);

  if (!pkg) {
    return (
      <div className="page-shell py-12">
        <EmptyState
          title="Package not found"
          description="This agency package is unavailable or the slug is incorrect."
          action={
            <Link href="/discover">
              <Button>Back to discover</Button>
            </Link>
          }
        />
      </div>
    );
  }

  // Fetch agency with reviews
  const agencyFull = await getAgencyBySlug(pkg.agency.slug).catch(() => null);
  const agencyReviews = agencyFull?.reviewsReceived ?? [];

  const shareUrl = buildWhatsAppShareHref(
    `Check this TravellersIn package: ${pkg.title}`,
    `/packages/${pkg.slug}`,
  );

  const durationLabel = formatDurationLabel(pkg.startDate, pkg.endDate);
  const gallery = (pkg.galleryUrls ?? []) as string[];
  const itinerary = (pkg.itinerary ?? []) as DayPlan[];
  const currentSize = pkg.group?.currentSize ?? 0;
  const spotsLeft = pkg.groupSizeMax - currentSize;
  const vibes = formatVibes(pkg.vibes);
  const activities = (pkg.activities ?? []) as string[];

  // Build inclusions summary chips (quick highlights like Thrillophilia)
  const inclusionChips: { icon: typeof CheckCircle2; label: string }[] = [];
  const inc = pkg.inclusions as Record<string, boolean | string | unknown> | null ?? {};
  if (inc.transport || inc.transfers) inclusionChips.push({ icon: Car, label: "Transfer Included" });
  if (inc.accommodation || inc.hotel || inc.stay) inclusionChips.push({ icon: Tent, label: "Stay Included" });
  if (inc.meals || inc.breakfast || inc.food) inclusionChips.push({ icon: Coffee, label: "Meals Included" });
  if (inc.sightseeing || inc.activities || activities.length > 0) inclusionChips.push({ icon: Eye, label: "Sightseeing Included" });

  return (
    <div className="page-shell space-y-4 pt-3 pb-24 sm:space-y-8 sm:pt-8 lg:pb-8">
      {/* ═══ Gallery ═══ */}
      <ImageGallery images={gallery} title={pkg.title} />

      {/* ═══ Title + Sidebar Layout ═══ */}
      <div>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px]">

          {/* ── Left: Title + Content ── */}
          <div className="space-y-5 min-w-0">

            {/* Hero title block */}
            <div>
              {/* Duration + status badges */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-600)] shadow-[var(--shadow-clay-sm)]">
                  {durationLabel}
                </span>
                <span className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-600)] shadow-[var(--shadow-clay-sm)]">
                  Agency Package
                </span>
                {pkg.status === "OPEN" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                    <span className="size-1.5 rounded-full bg-[var(--color-sea-600)] inline-block" />
                    Booking Open
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl leading-tight text-[var(--color-ink-950)] sm:text-4xl">
                {pkg.title}
              </h1>

              {/* Meta info row */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-ink-600)] sm:text-sm">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-[var(--color-sea-600)] shrink-0" />
                  <span>{pkg.destination}{pkg.destinationState ? `, ${pkg.destinationState}` : ""}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CalendarRange className="size-4 text-[var(--color-sea-600)] shrink-0" />
                  <span>{formatDateRange(pkg.startDate, pkg.endDate)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-4 text-[var(--color-sea-600)] shrink-0" />
                  <span>{currentSize}/{pkg.groupSizeMax} Travelers</span>
                </span>
                {pkg.agency.avgRating > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star className="size-3.5 fill-[var(--color-sunset-400)] text-[var(--color-sunset-400)] shrink-0" />
                    <span className="font-semibold text-[var(--color-ink-700)]">{pkg.agency.avgRating.toFixed(1)}</span>
                    <span className="text-[var(--color-ink-500)]">({pkg.agency.totalReviews} reviews)</span>
                  </span>
                )}
              </div>

              {/* Inclusion chips - Thrillophilia style */}
              {inclusionChips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-4 border-t border-[var(--color-line)] pt-4">
                  {inclusionChips.map((chip) => (
                    <span key={chip.label} className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-700)]">
                      <chip.icon className="size-4 text-[var(--color-sea-600)] shrink-0" />
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}

              {/* Vibe + activity tags */}
              {(vibes.length > 0 || activities.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {vibes.map((vibe) => (
                    <Badge key={vibe} variant="sea">{vibe}</Badge>
                  ))}
                  {activities.map((act) => (
                    <Badge key={act} variant="lavender">{act}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* ── Tabbed content ── */}
            <Card className="p-5 sm:p-6">
                <TripTabs
                  defaultTab="itinerary"
                  tabs={[
                    {
                      key: "itinerary",
                      label: "Itinerary",
                      icon: <Route className="size-4" />,
                      content: (
                        <DayStepper
                          days={itinerary}
                          totalDays={itinerary.length}
                          galleryUrls={pkg.galleryUrls ?? []}
                          destination={pkg.destination}
                        />
                      ),
                    },
                    {
                      key: "overview",
                      label: "Overview",
                      icon: <Compass className="size-4" />,
                      content: (
                        <div className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {[
                              {
                                label: "Destination",
                                value: `${pkg.destination}${pkg.destinationState ? `, ${pkg.destinationState}` : ""}`,
                                icon: MapPin,
                              },
                              {
                                label: "Duration",
                                value: durationLabel,
                                icon: Clock,
                              },
                              {
                                label: "Accommodation",
                                value: pkg.accommodation || "As per itinerary",
                                icon: Tent,
                              },
                              {
                                label: "Group size",
                                value: `${pkg.groupSizeMin}–${pkg.groupSizeMax} travelers`,
                                icon: Users,
                              },
                            ].map((detail) => (
                              <CardInset
                                key={detail.label}
                                className="flex items-start gap-3 p-3.5"
                              >
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-sea-50)] border border-[var(--color-sea-100)]">
                                  <detail.icon className="size-4 text-[var(--color-sea-700)]" />
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                                    {detail.label}
                                  </p>
                                  <p className="mt-0.5 text-sm text-[var(--color-ink-700)]">
                                    {detail.value}
                                  </p>
                                </div>
                              </CardInset>
                            ))}
                          </div>

                          {pkg.departureDates && (pkg.departureDates as string[]).length > 0 && (
                            <div>
                              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                                Available departure dates
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(pkg.departureDates as string[]).map((date) => (
                                  <span
                                    key={date}
                                    className="rounded-full bg-[var(--color-sea-50)] px-3 py-1.5 text-xs font-semibold text-[var(--color-sea-700)] border border-[var(--color-sea-200)]"
                                  >
                                    {formatCompactDate(date)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "inclusions",
                      label: "Inclusions",
                      icon: <span className="text-sm">✓</span>,
                      content: (
                        <InclusionsCard
                          inclusions={pkg.inclusions}
                          exclusions={pkg.exclusions}
                        />
                      ),
                    },
                    {
                      key: "pricing",
                      label: "Pricing",
                      icon: <DollarSign className="size-4" />,
                      content: (
                        <PricingTable
                          basePrice={pkg.basePrice}
                          tiers={pkg.pricingTiers}
                          groupSizeMin={pkg.groupSizeMin}
                          groupSizeMax={pkg.groupSizeMax}
                          currentSize={currentSize}
                          groupId={pkg.group?.id}
                        />
                      ),
                    },
                  ]}
                />
            </Card>

            {/* ── MOBILE ONLY: Booking + Who's Going ── */}
            <div className="lg:hidden space-y-4" id="mobile-join-card">
              {/* Booking card */}
              <Card className="overflow-hidden p-0">
                <div className="p-5 pb-4">
                  {pkg.agency.avgRating > 0 && (
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <Star className="size-3.5 fill-[var(--color-sunset-400)] text-[var(--color-sunset-400)]" />
                      <span className="text-sm font-semibold text-[var(--color-ink-700)]">{pkg.agency.avgRating.toFixed(1)}</span>
                      <span className="text-xs text-[var(--color-ink-500)]">({pkg.agency.totalReviews} reviews)</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-extrabold text-[var(--color-ink-950)]">
                      {formatCurrency(pkg.basePrice)}
                    </span>
                    <span className="text-sm text-[var(--color-ink-500)]">/person</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--color-ink-500)]">+ taxes as applicable</p>
                </div>
                <div className="space-y-2 border-t border-[var(--color-line)] px-5 pb-5">
                  <BookingSidebar
                    groupId={pkg.group?.id}
                    price={pkg.basePrice}
                    startDate={pkg.startDate}
                    endDate={pkg.endDate}
                    groupSizeMax={pkg.groupSizeMax}
                    currentSize={currentSize}
                    spotsLeft={spotsLeft}
                    shareUrl={shareUrl}
                    departureDates={pkg.departureDates}
                    label="Book Now"
                  />
                </div>
                {/* Agency inline */}
                <div className="border-t border-[var(--color-line)] px-5 py-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-500)]">Organized by</p>
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-surface-2)] font-bold text-sm text-[var(--color-ink-700)]">
                      {pkg.agency.logoUrl ? (
                        <img src={pkg.agency.logoUrl} alt={pkg.agency.name} className="size-full object-cover" />
                      ) : (
                        initials(pkg.agency.name)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${pkg.agency.slug}`} className="block truncate text-sm font-semibold text-[var(--color-ink-900)] transition hover:text-[var(--color-sea-700)]">
                        {pkg.agency.name}
                      </Link>
                      <div className="mt-0.5">
                        <AgencyVerificationBadge status={pkg.agency.verification} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Who's Going */}
              <Card className="p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="size-4 text-[var(--color-sea-600)]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-ink-500)]">Who&apos;s Going</p>
                </div>
                <EnrolledMembers
                  members={pkg.group?.members ?? []}
                  maxSize={pkg.groupSizeMax}
                  currentSize={currentSize}
                  maleCount={pkg.group?.maleCount}
                  femaleCount={pkg.group?.femaleCount}
                  otherCount={pkg.group?.otherCount}
                />
              </Card>
            </div>

            {/* Reviews (below tabs) */}
            {agencyReviews.length > 0 && (
              <Card className="p-5 sm:p-6">
                <ReviewsSection
                  reviews={agencyReviews}
                  avgRating={pkg.agency.avgRating}
                  totalReviews={pkg.agency.totalReviews}
                />
              </Card>
            )}
          </div>

          {/* ── Right: Sticky Sidebar ── */}
          <div className="hidden lg:block">
            <div className="sticky top-24 space-y-3">
              {/* Price + booking card — Stitch reference style */}
              <Card className="overflow-hidden p-0">
                {/* Plan type label */}
                <div className="px-5 pt-5 pb-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Private Journey</p>
                </div>
                {/* Price */}
                <div className="px-5 pb-4 pt-2">
                  {pkg.agency.avgRating > 0 && (
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <Star className="size-3.5 fill-[var(--color-sunset-400)] text-[var(--color-sunset-400)]" />
                      <span className="text-sm font-semibold text-[var(--color-ink-700)]">{pkg.agency.avgRating.toFixed(1)}</span>
                      <span className="text-xs text-[var(--color-ink-500)]">({pkg.agency.totalReviews} reviews)</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-extrabold text-[var(--color-ink-950)]">
                      {formatCurrency(pkg.basePrice)}
                    </span>
                    <span className="text-sm text-[var(--color-ink-500)]">/person</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--color-ink-500)]">+ taxes as applicable</p>
                </div>

                {/* CTAs */}
                <div className="px-5 pb-5 space-y-2">
                  <BookingSidebar
                    groupId={pkg.group?.id}
                    price={pkg.basePrice}
                    startDate={pkg.startDate}
                    endDate={pkg.endDate}
                    groupSizeMax={pkg.groupSizeMax}
                    currentSize={currentSize}
                    spotsLeft={spotsLeft}
                    shareUrl={shareUrl}
                    departureDates={pkg.departureDates}
                    label="Book Now"
                    compact
                  />
                </div>

                {/* Agency inline */}
                <div className="border-t border-[var(--color-line)] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-surface-2)] font-bold text-sm text-[var(--color-ink-700)]">
                      {pkg.agency.logoUrl ? (
                        <img src={pkg.agency.logoUrl} alt={pkg.agency.name} className="size-full object-cover" />
                      ) : (
                        initials(pkg.agency.name)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profile/${pkg.agency.slug}`} className="block truncate text-sm font-semibold text-[var(--color-ink-900)] transition hover:text-[var(--color-sea-700)]">
                        {pkg.agency.name}
                      </Link>
                      <div className="mt-0.5">
                        <AgencyVerificationBadge status={pkg.agency.verification} />
                      </div>
                    </div>
                  </div>
                  {/* USP checklist */}
                  <ul className="mt-3 space-y-1.5">
                    {[
                      "Escrow-protected payments",
                      "Verified traveler profiles",
                      "Group chat before you book",
                    ].map((usp) => (
                      <li key={usp} className="flex items-center gap-2 text-xs text-[var(--color-ink-600)]">
                        <CheckCircle2 className="size-3.5 shrink-0 text-[var(--color-sea-600)]" />
                        {usp}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              {/* Who's Going */}
              <Card className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="size-4 text-[var(--color-sea-600)]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--color-ink-500)]">Who&apos;s Going</p>
                </div>
                <EnrolledMembers
                  members={pkg.group?.members ?? []}
                  maxSize={pkg.groupSizeMax}
                  currentSize={currentSize}
                  maleCount={pkg.group?.maleCount}
                  femaleCount={pkg.group?.femaleCount}
                  otherCount={pkg.group?.otherCount}
                />
              </Card>

              {/* Cancellation policy */}
              <Card className="p-5">
                <CancellationPolicy policy={pkg.cancellationPolicy} />
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Mobile sticky bottom bar ═══ */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/60 bg-[var(--color-surface)]/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-[var(--color-ink-500)]">Starting from</p>
            <div className="flex items-baseline gap-1">
              <p className="font-display text-xl font-extrabold text-[var(--color-ink-950)]">
                {formatCurrency(pkg.basePrice)}
              </p>
              <p className="text-xs text-[var(--color-ink-500)]">/person</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-raised)] px-3.5 text-sm font-semibold text-[var(--color-ink-700)] transition hover:bg-[var(--color-surface-2)]"
            >
              Share
            </a>
            <a
              href="#mobile-join-card"
              className="flex h-10 items-center gap-2 rounded-xl bg-green-900 px-5 text-sm font-bold text-white shadow-[var(--shadow-clay-sm)] transition hover:bg-green-700"
            >
              <Ticket className="size-4" />
              Book Now
            </a>
          </div>
        </div>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="h-24 lg:hidden" />
    </div>
  );
}
