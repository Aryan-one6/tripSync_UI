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
  HelpCircle,
} from "lucide-react";
import { ImageGallery } from "@/components/trip/image-gallery";
import { DayStepper, type DayPlan } from "@/components/trip/day-stepper";
import { TripTabs } from "@/components/trip/trip-tabs";
import { FaqAccordion, type FaqItem } from "@/components/trip/faq-accordion";
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

// Default FAQ items for packages
const DEFAULT_FAQS: FaqItem[] = [
  {
    question: "How is the group formed?",
    answer:
      "TravellersIn uses a social-first approach — travelers join based on shared interests, vibes, and schedules. You can see who else has enrolled before committing, so you travel with people you feel comfortable with.",
  },
  {
    question: "Is the price per person or for the whole group?",
    answer:
      "All listed prices are per person. Group discounts may apply as more travelers join — check the pricing section for tier details.",
  },
  {
    question: "How are payments handled?",
    answer:
      "Payments go through our secure escrow system powered by Razorpay. Your money is held safely and released to the agency in tranches — partial during booking confirmation and the rest after trip completion.",
  },
  {
    question: "Can I cancel after booking?",
    answer:
      "Yes, cancellation policies vary by package. Check the cancellation policy section below for specific refund timelines. We recommend booking with confidence — you can always chat with co-travelers in the group before committing.",
  },
  {
    question: "How do I verify other travelers?",
    answer:
      "TravellersIn has a 3-tier verification system: Basic (phone verified), Verified (Aadhaar eKYC), and Trusted (completed trips + high ratings). You can see each traveler's verification badge on their profile.",
  },
  {
    question: "What if the minimum group size isn't met?",
    answer:
      "If the minimum group size isn't reached by the departure date, the agency may offer revised dates or a full refund. You'll be notified well in advance.",
  },
];

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

  return (
    <div className="page-shell space-y-8 py-10">
      {/* ═══ Hero Section ═══ */}
      <div className="space-y-4">
        {/* Image gallery */}
        <ImageGallery images={gallery} title={pkg.title} />

        {/* Title & quick info bar */}
        <Card className="relative overflow-hidden p-0">
          <div className="clay-blob -top-12 -right-12 size-32 bg-[var(--color-sea-200)] opacity-10 animate-blob" />
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start gap-3">
              <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                Agency package
              </span>
              <span className="inline-flex items-center rounded-full bg-[var(--color-lavender-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-lavender-500)] shadow-[var(--shadow-clay-sm)]">
                {durationLabel}
              </span>
              {pkg.status === "OPEN" && (
                <span className="inline-flex items-center rounded-full bg-[var(--color-sea-600)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-[var(--shadow-clay-sm)]">
                  Booking open
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-3xl leading-tight text-[var(--color-ink-950)] sm:text-4xl md:text-5xl">
              {pkg.title}
            </h1>

            {/* Quick info strip */}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--color-ink-600)]">
              <span className="inline-flex items-center gap-2">
                <MapPin className="size-4 text-[var(--color-sea-600)]" />
                {pkg.destination}
                {pkg.destinationState ? `, ${pkg.destinationState}` : ""}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarRange className="size-4 text-[var(--color-sea-600)]" />
                {formatDateRange(pkg.startDate, pkg.endDate)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Users className="size-4 text-[var(--color-sea-600)]" />
                {currentSize}/{pkg.groupSizeMax} joined
              </span>
              <span className="inline-flex items-center gap-2">
                <DollarSign className="size-4 text-[var(--color-sea-600)]" />
                From {formatCurrency(pkg.basePrice)}/person
              </span>
              {pkg.agency.avgRating > 0 && (
                <span className="inline-flex items-center gap-2">
                  <Star className="size-4 fill-current text-[var(--color-sunset-400)]" />
                  {pkg.agency.avgRating.toFixed(1)} ({pkg.agency.totalReviews} reviews)
                </span>
              )}
            </div>

            {/* Vibes & activities */}
            {(vibes.length > 0 || activities.length > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {vibes.map((vibe) => (
                  <Badge key={vibe} variant="sea">
                    {vibe}
                  </Badge>
                ))}
                {activities.map((act) => (
                  <Badge key={act} variant="lavender">
                    {act}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ═══ Main content + Sidebar ═══ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main content area */}
        <div className="space-y-6">
          {/* Tabbed content */}
          <Card className="p-5 sm:p-6">
            <TripTabs
              defaultTab="itinerary"
              tabs={[
                {
                  key: "itinerary",
                  label: "Day Plan",
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
                      {/* Trip overview details grid */}
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
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]">
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

                      {/* Departure dates */}
                      {pkg.departureDates && (pkg.departureDates as string[]).length > 0 && (
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                            Available departure dates
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(pkg.departureDates as string[]).map((date) => (
                              <span
                                key={date}
                                className="rounded-full bg-[var(--color-sea-50)] px-3 py-1.5 text-xs font-semibold text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]"
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
          </Card>

          {/* Reviews section */}
          {agencyReviews.length > 0 && (
            <Card className="p-5 sm:p-6">
              <ReviewsSection
                reviews={agencyReviews}
                avgRating={pkg.agency.avgRating}
                totalReviews={pkg.agency.totalReviews}
              />
            </Card>
          )}

          {/* Cancellation policy */}
          <Card className="p-5 sm:p-6">
            <CancellationPolicy policy={pkg.cancellationPolicy} />
          </Card>

          {/* FAQ */}
          <Card className="p-5 sm:p-6" id="enquiry-section">
            <div className="mb-4 flex items-center gap-2">
              <HelpCircle className="size-5 text-[var(--color-sea-600)]" />
              <h2 className="font-display text-xl text-[var(--color-ink-950)]">
                Frequently asked questions
              </h2>
            </div>
            <FaqAccordion items={DEFAULT_FAQS} />
          </Card>
        </div>

        {/* ═══ Sidebar ═══ */}
        <div className="space-y-4">
          {/* Booking widget */}
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
            label="Join this package"
          />

          {/* Agency card */}
          <Card className="p-5">
            <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
              Organized by
            </span>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex size-14 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] font-display text-lg text-[var(--color-sea-800)] shadow-[var(--shadow-clay-sm)]">
                {pkg.agency.logoUrl ? (
                  <img
                    src={pkg.agency.logoUrl}
                    alt={pkg.agency.name}
                    className="size-full rounded-[var(--radius-lg)] object-cover"
                  />
                ) : (
                  initials(pkg.agency.name)
                )}
              </div>
              <div>
                <Link
                  href={`/agencies/${pkg.agency.slug}`}
                  className="font-display text-lg text-[var(--color-ink-950)] transition hover:text-[var(--color-sea-700)]"
                >
                  {pkg.agency.name}
                </Link>
                <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                  <Star className="size-3.5 fill-current text-[var(--color-sunset-500)]" />
                  {pkg.agency.avgRating.toFixed(1)} · {pkg.agency.totalReviews ?? 0} reviews
                </div>
                <div className="mt-2">
                  <AgencyVerificationBadge status={pkg.agency.verification} />
                </div>
              </div>
            </div>
            {pkg.agency.specializations && (pkg.agency.specializations as string[]).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(pkg.agency.specializations as string[]).slice(0, 4).map((spec) => (
                  <span
                    key={spec}
                    className="rounded-full bg-[var(--color-sand-100)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-ink-600)] shadow-[var(--shadow-clay-sm)]"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            )}
            {(pkg.agency.totalTrips ?? 0) > 0 && (
              <p className="mt-3 text-xs text-[var(--color-ink-500)]">
                {pkg.agency.totalTrips} trips organized
              </p>
            )}
          </Card>

          {/* Enrolled members */}
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="size-4 text-[var(--color-sea-600)]" />
              <p className="font-display text-base text-[var(--color-ink-950)]">
                Who&apos;s going
              </p>
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

          {/* TravellersIn USP callout */}
          <CardInset className="space-y-3 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
              Why TravellersIn
            </p>
            {[
              {
                title: "See who you're traveling with",
                desc: "Verified profiles with trip history & ratings",
              },
              {
                title: "Escrow-protected payments",
                desc: "Your money is safe until the trip is completed",
              },
              {
                title: "Group chat before you book",
                desc: "Connect with co-travelers, ask questions, vibe check",
              },
              {
                title: "Social proof & reviews",
                desc: "Real ratings from real travelers on every trip",
              },
            ].map((usp) => (
              <div key={usp.title} className="flex items-start gap-2">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--color-sea-400)]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--color-ink-800)]">
                    {usp.title}
                  </p>
                  <p className="text-[10px] text-[var(--color-ink-500)]">
                    {usp.desc}
                  </p>
                </div>
              </div>
            ))}
          </CardInset>
        </div>
      </div>
    </div>
  );
}
