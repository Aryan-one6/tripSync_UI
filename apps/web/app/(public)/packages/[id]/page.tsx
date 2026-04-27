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
  ChevronRight,
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
    <div className="min-h-screen bg-[var(--color-surface)]">
      {/* ═══ Breadcrumb ═══ */}
      <div className="page-shell py-3">
        <nav className="flex items-center gap-1.5 text-xs text-[var(--color-ink-500)]" aria-label="Breadcrumb">
          <Link href="/discover" className="hover:text-[var(--color-sea-700)] transition-colors">Packages</Link>
          <ChevronRight className="size-3 shrink-0" />
          <span className="truncate font-medium text-[var(--color-ink-700)]">{pkg.destination}</span>
          <ChevronRight className="size-3 shrink-0" />
          <span className="truncate text-[var(--color-ink-400)]">{pkg.title}</span>
        </nav>
      </div>

      {/* ═══ Full-width Gallery ═══ */}
      <div className="page-shell pb-0">
        <ImageGallery images={gallery} title={pkg.title} />
      </div>

      {/* ═══ Title + Sidebar Layout ═══ */}
      <div className="page-shell py-5 sm:py-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px]">

          {/* ── Left: Title + Content ── */}
          <div className="space-y-5 min-w-0">

            {/* Hero title block */}
            <div>
              {/* Duration + status badges */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[var(--color-sea-700)] px-3 py-1 text-[11px] font-bold text-white tracking-wide">
                  {durationLabel}
                </span>
                <span className="inline-flex items-center rounded-full bg-[var(--color-sea-100)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-sea-700)] border border-[var(--color-sea-200)]">
                  Agency Package
                </span>
                {pkg.status === "OPEN" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-[11px] font-bold text-green-700 border border-green-200">
                    <span className="size-1.5 rounded-full bg-green-500 inline-block" />
                    Booking Open
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl font-bold leading-tight text-[var(--color-ink-950)] sm:text-3xl md:text-4xl">
                {pkg.title}
              </h1>

              {/* Meta info row */}
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--color-ink-600)]">
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4 text-[var(--color-sea-600)] shrink-0" />
                  <span className="font-medium">{pkg.destination}{pkg.destinationState ? `, ${pkg.destinationState}` : ""}</span>
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
                    <Star className="size-4 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="font-semibold text-[var(--color-ink-800)]">{pkg.agency.avgRating.toFixed(1)}</span>
                    <span className="text-[var(--color-ink-500)]">({pkg.agency.totalReviews} reviews)</span>
                  </span>
                )}
              </div>

              {/* Inclusion chips - Thrillophilia style */}
              {inclusionChips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {inclusionChips.map((chip) => (
                    <span key={chip.label} className="flex items-center gap-1.5 text-sm text-[var(--color-ink-700)]">
                      <chip.icon className="size-4 text-[var(--color-sea-600)]" />
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
            <Card className="overflow-hidden border-0 shadow-md p-0">
              <div className="p-5 sm:p-6">
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
                        />
                      ),
                    },
                  ]}
                />
              </div>
            </Card>

            {/* ── MOBILE ONLY: Organized By + Join + Who's Going ── */}
            <div className="lg:hidden space-y-4" id="mobile-join-card">
              {/* Join card */}
              <Card className="overflow-hidden border border-[var(--color-sea-200)] shadow-lg p-0">
                <div className="bg-white p-5 pb-4">
                  {pkg.agency.avgRating > 0 && (
                    <div className="mb-3 flex items-center gap-1.5">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-[var(--color-ink-900)]">{pkg.agency.avgRating.toFixed(1)}</span>
                      <span className="text-sm text-[var(--color-ink-500)]">({pkg.agency.totalReviews} reviews)</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold text-[var(--color-ink-950)]">
                      {formatCurrency(pkg.basePrice)}
                    </span>
                    <span className="text-sm text-[var(--color-ink-500)]">Per Adult</span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-400)]">+ taxes as applicable</p>
                </div>
                <div className="border-t border-[var(--color-sea-100)] p-5 pt-4">
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
                    label="Join Group"
                  />
                </div>
              </Card>

              {/* Agency card */}
              <Card className="p-5 border-0 shadow-md">
                <span className="inline-flex items-center rounded-full bg-[var(--color-sea-100)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-sea-700)] border border-[var(--color-sea-200)]">
                  Organized by
                </span>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex size-14 items-center justify-center rounded-xl bg-[var(--color-sea-50)] font-display text-base text-[var(--color-sea-800)] border border-[var(--color-sea-200)]">
                    {pkg.agency.logoUrl ? (
                      <img src={pkg.agency.logoUrl} alt={pkg.agency.name} className="size-full rounded-xl object-cover" />
                    ) : (
                      initials(pkg.agency.name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${pkg.agency.slug}`} className="font-semibold text-[var(--color-ink-950)] transition hover:text-[var(--color-sea-700)] truncate block">
                      {pkg.agency.name}
                    </Link>
                    {pkg.agency.avgRating > 0 && (
                      <div className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-ink-600)]">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">{pkg.agency.avgRating.toFixed(1)}</span>
                        <span>· {pkg.agency.totalReviews ?? 0} reviews</span>
                      </div>
                    )}
                    <div className="mt-1.5">
                      <AgencyVerificationBadge status={pkg.agency.verification} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Who's Going */}
              <Card className="p-5 border-0 shadow-md">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="size-4 text-[var(--color-sea-600)]" />
                  <p className="font-semibold text-[var(--color-ink-950)]">Who&apos;s Going</p>
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

            {/* Reviews */}
            {agencyReviews.length > 0 && (
              <Card className="p-5 sm:p-6 border-0 shadow-md">
                <ReviewsSection
                  reviews={agencyReviews}
                  avgRating={pkg.agency.avgRating}
                  totalReviews={pkg.agency.totalReviews}
                />
              </Card>
            )}

            {/* Cancellation policy */}
            <Card className="p-5 sm:p-6 border-0 shadow-md">
              <CancellationPolicy policy={pkg.cancellationPolicy} />
            </Card>
          </div>

          {/* ── Right: Sticky Sidebar ── */}
          <div className="hidden lg:block">
            <div className="sticky top-4 space-y-4">
              {/* Price + booking card */}
              <Card className="overflow-hidden border border-[var(--color-sea-200)] shadow-lg p-0">
                {/* Price header */}
                <div className="bg-white p-5 pb-4">
                  {pkg.agency.avgRating > 0 && (
                    <div className="mb-3 flex items-center gap-1.5">
                      <Star className="size-4 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-[var(--color-ink-900)]">{pkg.agency.avgRating.toFixed(1)}</span>
                      <span className="text-sm text-[var(--color-ink-500)]">({pkg.agency.totalReviews} reviews)</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-3xl font-bold text-[var(--color-ink-950)]">
                      {formatCurrency(pkg.basePrice)}
                    </span>
                    <span className="text-sm text-[var(--color-ink-500)]">Per Adult</span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-400)]">+ taxes as applicable</p>
                </div>

                <div className="border-t border-[var(--color-sea-100)] p-5 pt-4">
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
                    label="Join Group"
                    compact
                  />
                </div>
              </Card>

                {/* Agency card */}
              <Card className="p-5 border-0 shadow-md">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ink-500)] mb-3">Organized by</p>
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--color-sea-50)] font-display text-base text-[var(--color-sea-800)] border border-[var(--color-sea-200)] shrink-0">
                    {pkg.agency.logoUrl ? (
                      <img src={pkg.agency.logoUrl} alt={pkg.agency.name} className="size-full rounded-xl object-cover" />
                    ) : (
                      initials(pkg.agency.name)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${pkg.agency.slug}`} className="font-semibold text-[var(--color-ink-950)] transition hover:text-[var(--color-sea-700)] truncate block text-sm">
                      {pkg.agency.name}
                    </Link>
                    {pkg.agency.avgRating > 0 && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--color-ink-600)]">
                        <Star className="size-3 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">{pkg.agency.avgRating.toFixed(1)}</span>
                        <span>· {pkg.agency.totalReviews ?? 0} reviews</span>
                      </div>
                    )}
                    <div className="mt-1">
                      <AgencyVerificationBadge status={pkg.agency.verification} />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Enrolled members */}
              <Card className="p-5 border-0 shadow-md">
                <div className="mb-4 flex items-center gap-2">
                  <Users className="size-4 text-[var(--color-sea-600)]" />
                  <p className="font-semibold text-[var(--color-ink-950)]">Who&apos;s Going</p>
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

              {/* USP */}
              <CardInset className="space-y-3 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                  Why TravellersIn
                </p>
                {[
                  { title: "See who you're traveling with", desc: "Verified profiles with trip history & ratings" },
                  { title: "Escrow-protected payments", desc: "Your money is safe until the trip is completed" },
                  { title: "Group chat before you book", desc: "Connect with co-travelers, ask questions, vibe check" },
                  { title: "Social proof & reviews", desc: "Real ratings from real travelers on every trip" },
                ].map((usp) => (
                  <div key={usp.title} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--color-sea-400)]" />
                    <div>
                      <p className="text-xs font-semibold text-[var(--color-ink-800)]">{usp.title}</p>
                      <p className="text-[10px] text-[var(--color-ink-500)]">{usp.desc}</p>
                    </div>
                  </div>
                ))}
              </CardInset>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Mobile sticky bottom bar — price only, scroll to join card ═══ */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-[var(--color-border)] bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.10)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-[var(--color-ink-500)]">Starting from</p>
            <div className="flex items-baseline gap-1">
              <p className="font-display text-xl font-bold text-[var(--color-ink-950)]">
                {formatCurrency(pkg.basePrice)}
              </p>
              <p className="text-xs text-[var(--color-ink-400)]">/person</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-[var(--color-sea-300)] bg-white px-3.5 text-sm font-semibold text-[var(--color-sea-700)] transition hover:bg-[var(--color-sea-50)]"
            >
              Share
            </a>
            <a
              href="#mobile-join-card"
              className="flex h-10 items-center rounded-xl bg-gradient-to-r from-[var(--color-sea-500)] to-[var(--color-sea-700)] px-5 text-sm font-bold text-white shadow-md transition hover:brightness-110"
            >
              Join Group
            </a>
          </div>
        </div>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="h-24 lg:hidden" />
    </div>
  );
}
