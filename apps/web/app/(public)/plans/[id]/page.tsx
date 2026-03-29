import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Users,
  CalendarRange,
  Wallet,
  Tent,
  UserCheck,
  Route,
  DollarSign,
  Star,
  HelpCircle,
  Sparkles,
  BadgeCheck,
  MessageSquare,
  Shield,
  HandCoins,
  Compass,
  Mountain,
  Waves,
  Camera,
  Bike,
  TreePine,
  Snowflake,
  Coffee,
  Wind,
} from "lucide-react";
import { DayStepper, type DayPlan } from "@/components/trip/day-stepper";
import { TripTabs } from "@/components/trip/trip-tabs";
import { ImageGallery } from "@/components/trip/image-gallery";
import { FaqAccordion, type FaqItem } from "@/components/trip/faq-accordion";
import { InclusionsCard } from "@/components/trip/inclusions-card";
import { PricingTable } from "@/components/trip/pricing-table";
import { EnrolledMembers } from "@/components/trip/enrolled-members";
import { BookingSidebar } from "@/components/trip/booking-sidebar";
import { CancellationPolicy } from "@/components/trip/cancellation-policy";
import { MobileBottomBar } from "@/components/trip/mobile-bottom-bar";
import { GroupRealtimeRefresh } from "@/components/trip/group-realtime-refresh";
import { UserVerificationBadge, AgencyVerificationBadge } from "@/components/ui/verification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPlanBySlug } from "@/lib/api/public";
import {
  formatCurrency,
  formatDateRange,
  formatDuration,
  formatDurationLabel,
  formatVibes,
  initials,
} from "@/lib/format";
import { buildAbsoluteUrl, buildWhatsAppShareHref, compactDescription } from "@/lib/share";

export const dynamic = "force-dynamic";

async function loadPlan(slug: string) {
  return getPlanBySlug(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const plan = await loadPlan(id);

  if (!plan) {
    return {
      title: "Plan not found",
      description: "This TravellersIn plan is unavailable.",
    };
  }

  const description = compactDescription(
    plan.description ?? "",
    `${plan.title} in ${plan.destination} for ${plan.groupSizeMin}-${plan.groupSizeMax} travelers.`,
  );
  const url = buildAbsoluteUrl(`/plans/${plan.slug}`);
  const socialImage = plan.galleryUrls?.[0] ?? plan.coverImageUrl ?? undefined;

  return {
    title: plan.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: plan.title,
      description,
      url,
      type: "article",
      images: socialImage ? [{ url: socialImage }] : undefined,
    },
    twitter: {
      card: socialImage ? "summary_large_image" : "summary",
      title: plan.title,
      description,
      images: socialImage ? [socialImage] : undefined,
    },
  };
}

const PLAN_FAQS: FaqItem[] = [
  {
    question: "How does a user-created plan work?",
    answer:
      "A traveler creates a plan with their dream destination, dates, budget, and vibe preferences. Other travelers can join the group. Once the group forms, agencies bid with itinerary offers — and the group picks the best one together.",
  },
  {
    question: "Who decides which agency offer to accept?",
    answer:
      "The plan creator has the final say, but the group can discuss offers in the group chat. TravellersIn enables up to 3 rounds of negotiation with each agency to get the best deal.",
  },
  {
    question: "Is it safe to travel with strangers?",
    answer:
      "TravellersIn uses a 3-tier verification system (Basic → Verified → Trusted) with Aadhaar eKYC and trip-based ratings. You can check every member's profile, completed trips, and safety rating before joining.",
  },
  {
    question: "What if I change my mind after joining?",
    answer:
      "You can leave the group anytime before payment is committed. After payment, cancellation policies apply based on the selected agency's terms.",
  },
  {
    question: "How are payments handled?",
    answer:
      "All payments go through Razorpay-powered escrow. Your money is held securely and released to the agency in tranches — partial at booking and the rest after trip completion.",
  },
  
];

// Map activities to icons for visual display
const ACTIVITY_ICON_MAP: Record<string, React.ElementType> = {
  Trekking: Mountain,
  Rafting: Waves,
  "Cafe Hopping": Coffee,
  Paragliding: Wind,
  Camping: TreePine,
  Photography: Camera,
  Motorbiking: Bike,
  "Snow Play": Snowflake,
  "Sunrise Yoga": Compass,
};

// Map accommodation types to descriptions
const ACCOMMODATION_INFO: Record<string, { desc: string; features: string[] }> = {
  hostel: {
    desc: "Budget-friendly hostels with social common areas — perfect for meeting fellow travelers.",
    features: ["Shared dorms or private rooms", "Common lounge & kitchen", "WiFi included", "Lockers for valuables"],
  },
  budget: {
    desc: "Clean, comfortable budget hotels with essential amenities and great locations.",
    features: ["Private rooms with attached bath", "Daily housekeeping", "WiFi included", "Centrally located"],
  },
  premium: {
    desc: "Premium stays with top-notch amenities for a luxurious travel experience.",
    features: ["Luxury rooms with views", "Breakfast included", "Spa & pool access", "Concierge service"],
  },
  camping: {
    desc: "Outdoor camping experiences under the stars — for the true adventure seekers.",
    features: ["Quality tents & sleeping gear", "Campfire & BBQ setup", "Guided nature walks", "Stargazing sessions"],
  },
};

// Map group types to descriptions
const GROUP_TYPE_INFO: Record<string, string> = {
  friends: "A casual group of friends looking to share a trip. Easy-going, social, and fun-first.",
  couples: "Designed for couples traveling together. Romantic vibes, paired activities, and couple-friendly stays.",
  solo: "Perfect for solo travelers looking to meet like-minded people. No awkward third-wheeling — everyone's here to explore.",
  family: "Family-friendly trip with activities suitable for all ages. Safe, comfortable, and memory-making.",
  female_only: "A safe, empowering space for female travelers. Verified profiles, vetted members, and girl-trip energy.",
};

const SAFETY_TRUST_ITEMS: Array<{
  icon: React.ElementType;
  title: string;
  desc: string;
  iconWrapClassName: string;
  iconClassName: string;
}> = [
  {
    icon: BadgeCheck,
    title: "3-tier verification",
    desc: "Phone, Aadhaar eKYC, and trip history checks before you commit.",
    iconWrapClassName:
      "bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)]",
    iconClassName: "text-[var(--color-sea-700)]",
  },
  {
    icon: Star,
    title: "Ratings & reviews",
    desc: "See real safety and value feedback from past trips.",
    iconWrapClassName:
      "bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)]",
    iconClassName: "text-[var(--color-sunset-600)]",
  },
  {
    icon: Shield,
    title: "Escrow payments",
    desc: "Money stays protected and is released in stages, not upfront.",
    iconWrapClassName:
      "bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)]",
    iconClassName: "text-[var(--color-lavender-500)]",
  },
  {
    icon: MessageSquare,
    title: "Group chat first",
    desc: "Talk to co-travelers, ask questions, and vibe-check before paying.",
    iconWrapClassName:
      "bg-gradient-to-b from-[var(--color-rose-50)] to-[var(--color-rose-100)]",
    iconClassName: "text-[var(--color-rose-400)]",
  },
];

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean))) as string[];
}

export default async function PlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await loadPlan(id);

  if (!plan) {
    return (
      <div className="page-shell py-12">
        <EmptyState
          title="Plan not found"
          description="This trip may have been removed or the slug is incorrect."
          action={
            <Link href="/discover">
              <Button>Back to discover</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const shareUrl = buildWhatsAppShareHref(
    `Check out this TravellersIn plan: ${plan.title}`,
    `/plans/${plan.slug}`,
  );

  const durationLabel = formatDurationLabel(plan.startDate, plan.endDate);
  const duration = formatDuration(plan.startDate, plan.endDate);
  const currentSize = plan.group?.currentSize ?? 0;
  const spotsLeft = plan.groupSizeMax - currentSize;
  const vibes = formatVibes(plan.vibes);
  const activities = (plan.activities ?? []) as string[];
  const hasSelectedOffer = !!plan.selectedOffer;
  const offerItinerary = (plan.selectedOffer?.itinerary ?? []) as DayPlan[];
  const requestedItinerary = (plan.itinerary ?? []) as DayPlan[];
  const requestedHighlights = uniqueStrings(requestedItinerary.flatMap((day) => day.highlights ?? []));
  const requestedTransfers = requestedItinerary.flatMap((day) =>
    day.transport ? [{ day: day.day, label: day.transport }] : [],
  );
  const requestedStays = requestedItinerary.flatMap((day) =>
    day.accommodation ? [{ day: day.day, label: day.accommodation }] : [],
  );
  const requestedMeals = requestedItinerary.flatMap((day) =>
    (day.meals ?? []).map((meal) => ({ day: day.day, label: meal })),
  );
  const accomInfo = ACCOMMODATION_INFO[plan.accommodation ?? ""] ?? null;
  const groupTypeDesc = GROUP_TYPE_INFO[plan.groupType ?? ""] ?? null;

  const statusConfig: Record<string, { label: string; variant: "sea" | "sunset" | "lavender" }> = {
    DRAFT: { label: "Draft", variant: "lavender" },
    OPEN: { label: "Open for travelers", variant: "sea" },
    CONFIRMING: { label: "Confirming offer", variant: "sunset" },
    CONFIRMED: { label: "Trip confirmed", variant: "sea" },
    COMPLETED: { label: "Completed", variant: "sea" },
    EXPIRED: { label: "Expired", variant: "sunset" },
    CANCELLED: { label: "Cancelled", variant: "sunset" },
  };
  const status = statusConfig[plan.status] ?? statusConfig.OPEN;

  const galleryImages = uniqueStrings([...(plan.galleryUrls ?? []), plan.coverImageUrl]);

  return (
    <div className="page-shell space-y-4 pt-3 pb-24 sm:space-y-8 sm:pt-8 lg:pb-8">
      <GroupRealtimeRefresh groupId={plan.group?.id} />
      {/* ═══ Image Gallery ═══ */}
      <ImageGallery images={galleryImages} title={plan.title} />

      {/* ═══ Title + Meta Bar ═══ */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant} className="text-[10px] uppercase tracking-wider">
              {status.label}
            </Badge>
            <span className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-600)] shadow-[var(--shadow-clay-sm)]">
              <Sparkles className="mr-1 size-3" />
              Community plan
            </span>
            <span className="inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-600)] shadow-[var(--shadow-clay-sm)]">
              {durationLabel}
            </span>
          </div>

          <h1 className="mt-3 font-display text-2xl leading-tight text-[var(--color-ink-950)] sm:text-4xl">
            {plan.title}
          </h1>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--color-ink-600)] sm:text-sm">
            <span className="inline-flex items-start gap-2">
              <MapPin className="size-4 text-[var(--color-sea-600)]" />
              {plan.destination}
              {plan.destinationState ? `, ${plan.destinationState}` : ""}
            </span>
            <span className="inline-flex items-start gap-2">
              <CalendarRange className="size-4 text-[var(--color-sea-600)]" />
              {formatDateRange(plan.startDate, plan.endDate)}
              {plan.isDateFlexible && (
                <span className="rounded-full bg-[var(--color-sea-50)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-sea-700)]">Flexible</span>
              )}
            </span>
            <span className="inline-flex items-start gap-2">
              <Users className="size-4 text-[var(--color-sea-600)]" />
              {currentSize}/{plan.groupSizeMax} joined
            </span>
            <span className="inline-flex items-start gap-2">
              <Wallet className="size-4 text-[var(--color-sea-600)]" />
              {formatCurrency(plan.budgetMin)} – {formatCurrency(plan.budgetMax)}
            </span>
          </div>

          {plan.description && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-[var(--color-ink-600)]">
              {plan.description}
            </p>
          )}

          {/* Quick facts row */}
          <div className="mt-5 flex flex-wrap gap-2">
            {vibes.map((vibe) => (
              <Badge key={vibe} variant="sea">{vibe}</Badge>
            ))}
            {activities.slice(0, 4).map((act) => (
              <Badge key={act} variant="lavender">{act}</Badge>
            ))}
            {plan.accommodation && (
              <Badge variant="sunset" className="capitalize">{plan.accommodation}</Badge>
            )}
            {plan.groupType && (
              <Badge variant="rose" className="capitalize">
                {plan.groupType === "female_only" ? "Female only" : plan.groupType}
              </Badge>
            )}
          </div>
        </div>

        {/* Sidebar booking card - sticky, hidden on mobile (replaced by MobileBottomBar) */}
        <div className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <BookingSidebar
            groupId={plan.group?.id}
            price={hasSelectedOffer ? plan.selectedOffer!.pricePerPerson : plan.budgetMin ?? null}
            startDate={plan.startDate}
            endDate={plan.endDate}
            groupSizeMax={plan.groupSizeMax}
            currentSize={currentSize}
            spotsLeft={spotsLeft}
            shareUrl={shareUrl}
            requiresFemaleProfile={plan.genderPref === "female_only"}
            label={hasSelectedOffer ? "Join this trip" : "Join this plan"}
            members={plan.group?.members ?? []}
          />
        </div>
      </div>

      {/* ═══ Status callout ═══ */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-sea-100)] bg-[var(--color-sea-50)]/50 p-3.5 shadow-[var(--shadow-clay-sm)] sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-sea-600)] shadow-[var(--shadow-clay-sm)]">
            <Sparkles className="size-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-5 text-[var(--color-ink-900)] sm:leading-6">
              {plan.status === "OPEN" && currentSize < plan.groupSizeMin
                ? `${plan.groupSizeMin - currentSize} more traveler${plan.groupSizeMin - currentSize > 1 ? "s" : ""} needed to hit the minimum group size`
                : plan.status === "OPEN" && (plan.offers ?? []).length === 0
                  ? "Group is forming! Agencies will start sending offers once more travelers join."
                  : plan.status === "OPEN" && (plan.offers ?? []).length > 0
                    ? `${plan.offers!.length} agency offer${plan.offers!.length > 1 ? "s" : ""} received — join the group to vote!`
                    : hasSelectedOffer
                      ? `Trip confirmed with ${plan.selectedOffer!.agency.name} — secure your spot!`
                      : "This trip is progressing. Join now to be part of the journey!"}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--color-ink-600)] sm:text-sm sm:leading-6">
              {plan.status === "OPEN"
                ? "Once you join, you will get access to the group chat and can help shape the trip."
                : "Members can discuss trip details and coordinate in the group chat."}
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Main content + Sidebar ═══ */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_380px]">
        {/* Main content */}
        <div className="space-y-4 sm:space-y-8">

          {/* ── Selected offer itinerary (if confirmed) ── */}
          {hasSelectedOffer && (
            <Card className="p-4 sm:p-8">
              <TripTabs
                defaultTab="itinerary"
                tabs={[
                  {
                    key: "itinerary",
                    label: "Day Plan",
                    icon: <Route className="size-4" />,
                    content: (
                      <div className="space-y-5">
                        <CardInset className="flex items-center gap-3 border-[var(--color-sea-100)] bg-[var(--color-sea-50)]/50 p-4">
                          <div className="flex size-10 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-200)] shadow-[var(--shadow-clay-sm)]">
                            <Star className="size-5 text-[var(--color-sea-700)]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                              Itinerary by {plan.selectedOffer!.agency.name}
                            </p>
                            <p className="text-xs text-[var(--color-ink-600)]">
                              Selected offer · {formatCurrency(plan.selectedOffer!.pricePerPerson)}/person
                            </p>
                          </div>
                          <AgencyVerificationBadge status={plan.selectedOffer!.agency.verification} />
                        </CardInset>
                        <DayStepper days={offerItinerary} />
                      </div>
                    ),
                  },
                  {
                    key: "inclusions",
                    label: "Inclusions",
                    icon: <span className="text-sm">✓</span>,
                    content: <InclusionsCard inclusions={plan.selectedOffer!.inclusions} exclusions={null} />,
                  },
                  {
                    key: "pricing",
                    label: "Pricing",
                    icon: <DollarSign className="size-4" />,
                    content: (
                      <PricingTable
                        basePrice={plan.selectedOffer!.pricePerPerson}
                        tiers={plan.selectedOffer!.pricingTiers}
                        groupSizeMin={plan.groupSizeMin}
                        groupSizeMax={plan.groupSizeMax}
                        currentSize={currentSize}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          )}

          {/* ── Requested itinerary (if no offer selected) ── */}
          {!hasSelectedOffer && requestedItinerary.length > 0 && (
            <Card className="p-4 sm:p-8">
              <TripTabs
                defaultTab="itinerary"
                tabs={[
                  {
                    key: "itinerary",
                    label: "Itinerary",
                    icon: <Route className="size-4" />,
                    content: (
                      <DayStepper days={requestedItinerary} totalDays={requestedItinerary.length} />
                    ),
                  },
                  {
                    key: "activities",
                    label: "Activities",
                    icon: <Compass className="size-4" />,
                    content: (
                      <div className="space-y-5">
                        {activities.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {activities.map((activity) => (
                              <Badge key={activity} variant="lavender">{activity}</Badge>
                            ))}
                          </div>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          {requestedHighlights.length > 0 ? requestedHighlights.map((item) => (
                            <CardInset key={item} className="flex items-start gap-3 border-[var(--color-sea-100)] p-4">
                              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-200)] shadow-[var(--shadow-clay-sm)]">
                                <Compass className="size-4 text-[var(--color-sea-700)]" />
                              </div>
                              <p className="text-sm text-[var(--color-ink-700)]">{item}</p>
                            </CardInset>
                          )) : (
                            <CardInset className="sm:col-span-2 p-5 text-sm text-[var(--color-ink-600)]">
                              No activity highlights have been added yet.
                            </CardInset>
                          )}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "stay",
                    label: "Stay",
                    icon: <Tent className="size-4" />,
                    content: (
                      <div className="space-y-4">
                        {plan.accommodation && accomInfo && (
                          <CardInset className="border-[var(--color-lavender-100)] bg-[var(--color-lavender-50)]/45">
                            <p className="text-sm font-semibold capitalize text-[var(--color-ink-900)]">
                              {plan.accommodation}
                            </p>
                            <p className="mt-1 text-sm text-[var(--color-ink-600)]">{accomInfo.desc}</p>
                          </CardInset>
                        )}
                        {requestedStays.length > 0 ? (
                          <div className="grid gap-3">
                            {requestedStays.map((item) => (
                              <CardInset key={`${item.day}-${item.label}`} className="flex items-start gap-3 border-[var(--color-lavender-100)] p-4">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-lavender-100)] to-[var(--color-lavender-200)] text-xs font-bold text-[var(--color-lavender-500)] shadow-[var(--shadow-clay-sm)]">
                                  {item.day}
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">Day {item.day}</p>
                                  <p className="mt-1 text-sm text-[var(--color-ink-700)]">{item.label}</p>
                                </div>
                              </CardInset>
                            ))}
                          </div>
                        ) : (
                          <CardInset className="p-5 text-sm text-[var(--color-ink-600)]">
                            Detailed stay notes have not been listed yet.
                          </CardInset>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "transfers",
                    label: "Transfers",
                    icon: <Route className="size-4" />,
                    content: requestedTransfers.length > 0 ? (
                      <div className="grid gap-3">
                        {requestedTransfers.map((item) => (
                          <CardInset key={`${item.day}-${item.label}`} className="flex items-start gap-3 border-[var(--color-sea-100)] p-4">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-200)] text-xs font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                              {item.day}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">Day {item.day}</p>
                              <p className="mt-1 text-sm text-[var(--color-ink-700)]">{item.label}</p>
                            </div>
                          </CardInset>
                        ))}
                      </div>
                    ) : (
                      <CardInset className="p-5 text-sm text-[var(--color-ink-600)]">
                        Transfer details are still flexible and can be refined by agencies.
                      </CardInset>
                    ),
                  },
                  {
                    key: "meals",
                    label: "Meals",
                    icon: <Coffee className="size-4" />,
                    content: requestedMeals.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {requestedMeals.map((item) => (
                          <CardInset key={`${item.day}-${item.label}`} className="flex items-start gap-3 border-[var(--color-sunset-100)] p-4">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sunset-100)] to-[var(--color-sunset-200)] text-xs font-bold text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
                              {item.day}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">Day {item.day}</p>
                              <p className="mt-1 text-sm text-[var(--color-ink-700)]">{item.label}</p>
                            </div>
                          </CardInset>
                        ))}
                      </div>
                    ) : (
                      <CardInset className="p-5 text-sm text-[var(--color-ink-600)]">
                        Meal expectations have not been added yet.
                      </CardInset>
                    ),
                  },
                ]}
              />
            </Card>
          )}

          {/* ── Trip details — Accommodation, Group, Activities ── */}
          <Card className="p-4 sm:p-6">
            <h2 className="font-display text-lg text-[var(--color-ink-950)] sm:text-xl">
              Trip details
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-[var(--color-ink-600)] sm:text-sm sm:leading-relaxed">
              {hasSelectedOffer
                ? "What the creator envisioned for this trip."
                : "Preferences set by the creator. Agencies will tailor their offers to match."}
            </p>

            <div className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-3 sm:grid-cols-2">
              {/* Duration & dates */}
              <CardInset className="h-full border-[var(--color-sea-100)] p-3 sm:p-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-200)] shadow-[var(--shadow-clay-sm)] sm:size-9">
                    <CalendarRange className="size-3.5 text-[var(--color-sea-700)] sm:size-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Duration</p>
                    <p className="text-[13px] font-semibold text-[var(--color-ink-800)] sm:text-sm">
                      {duration ? `${duration.days} days, ${duration.nights} nights` : "Flexible dates"}
                    </p>
                  </div>
                </div>
              </CardInset>

              {/* Budget */}
              <CardInset className="h-full border-[var(--color-sea-100)] p-3 sm:p-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-200)] shadow-[var(--shadow-clay-sm)] sm:size-9">
                    <Wallet className="size-3.5 text-[var(--color-sea-700)] sm:size-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Budget per person</p>
                    <p className="text-[13px] font-semibold text-[var(--color-ink-800)] sm:text-sm">
                      {formatCurrency(plan.budgetMin)} – {formatCurrency(plan.budgetMax)}
                    </p>
                  </div>
                </div>
              </CardInset>

              {/* Accommodation */}
              {plan.accommodation && (
                <CardInset className="h-full border-[var(--color-lavender-100)] p-3 sm:p-4">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-lavender-100)] to-[var(--color-lavender-200)] shadow-[var(--shadow-clay-sm)] sm:size-9">
                      <Tent className="size-3.5 text-[var(--color-lavender-500)] sm:size-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Accommodation</p>
                      <p className="text-[13px] font-semibold capitalize text-[var(--color-ink-800)] sm:text-sm">
                        {plan.accommodation === "budget" ? "Budget Hotel" : plan.accommodation}
                      </p>
                    </div>
                  </div>
                  {accomInfo && (
                    <p className="mt-2 text-[11px] leading-5 text-[var(--color-ink-600)] sm:mt-2.5 sm:text-sm sm:leading-6">
                      {accomInfo.desc}
                    </p>
                  )}
                </CardInset>
              )}

              {/* Group type */}
              {plan.groupType && (
                <CardInset className="h-full border-[var(--color-rose-100)] p-3 sm:p-4">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-gradient-to-b from-[var(--color-rose-100)] to-[var(--color-rose-200)] shadow-[var(--shadow-clay-sm)] sm:size-9">
                      <UserCheck className="size-3.5 text-[var(--color-rose-400)] sm:size-4" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">Group type</p>
                      <p className="text-[13px] font-semibold capitalize text-[var(--color-ink-800)] sm:text-sm">
                        {plan.groupType === "female_only" ? "Female Only" : plan.groupType}
                      </p>
                    </div>
                  </div>
                  {groupTypeDesc && (
                    <p className="mt-2 text-[11px] leading-5 text-[var(--color-ink-600)] sm:mt-2.5 sm:text-sm sm:leading-6">
                      {groupTypeDesc}
                    </p>
                  )}
                </CardInset>
              )}
            </div>

            {/* Activities */}
            {activities.length > 0 && (
              <div className="mt-3.5 border-t border-[var(--color-line)] pt-3.5 sm:mt-4 sm:pt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
                  Planned activities
                </p>
                <div className="flex flex-wrap gap-2">
                  {activities.map((activity) => {
                    const IconComp = ACTIVITY_ICON_MAP[activity] ?? Compass;
                    return (
                      <span
                        key={activity}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-[var(--color-surface-2)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-ink-800)] shadow-[var(--shadow-clay-inset)] sm:gap-2 sm:px-3 sm:py-2 sm:text-xs"
                      >
                        <div className="flex size-5 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-lavender-50)] to-[var(--color-lavender-100)] shadow-[var(--shadow-clay-sm)] sm:size-6">
                          <IconComp className="size-3 text-[var(--color-lavender-500)] sm:size-3.5" />
                        </div>
                        {activity}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pending offers */}
            {!hasSelectedOffer && (plan.offers ?? []).length > 0 && (
              <div className="mt-3.5 rounded-[var(--radius-md)] border border-[var(--color-sunset-100)] bg-gradient-to-br from-[var(--color-sunset-50)]/50 to-white p-3 shadow-[var(--shadow-clay-sm)] sm:mt-4 sm:p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sunset-100)] to-[var(--color-sunset-200)] shadow-[var(--shadow-clay-sm)]">
                    <HandCoins className="size-4 text-[var(--color-sunset-700)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                      {plan.offers!.length} agency offer{plan.offers!.length > 1 ? "s" : ""} received
                    </p>
                    <p className="text-xs text-[var(--color-ink-600)]">
                      The plan creator is reviewing offers. Join the group to participate in the decision!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Cancellation policy (if offer selected) */}
          {hasSelectedOffer && (
            <Card className="p-6 sm:p-8">
              <CancellationPolicy policy={plan.selectedOffer!.cancellationPolicy} />
            </Card>
          )}

          {/* ── FAQ ── */}
          <Card className="p-4 sm:p-6" id="enquiry-section">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] shadow-[var(--shadow-clay-sm)]">
                <HelpCircle className="size-4 text-[var(--color-sea-600)]" />
              </div>
              <div>
                <h2 className="font-display text-base text-[var(--color-ink-950)] sm:text-xl">
                Frequently asked questions
                </h2>
                <p className="text-xs text-[var(--color-ink-600)] sm:text-sm">
                  Quick answers on joining, payments, and how the plan works.
                </p>
              </div>
            </div>
            <FaqAccordion items={PLAN_FAQS} />
          </Card>
        </div>

        {/* ═══ Sidebar ═══ */}
        <div className="space-y-4">
          {/* Creator card — desktop only (mobile version shown above) */}
          <Card className="p-4 sm:p-5">
            <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
              Created by
            </span>
            <div className="mt-3 flex items-center gap-3 sm:mt-4 sm:gap-4">
              <div className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] font-display text-base text-[var(--color-sea-800)] shadow-[var(--shadow-clay-sm)]">
                {plan.creator.avatarUrl ? (
                  <Image
                    src={plan.creator.avatarUrl}
                    alt={plan.creator.fullName}
                    width={48}
                    height={48}
                    className="size-full rounded-[var(--radius-lg)] object-cover"
                  />
                ) : (
                  initials(plan.creator.fullName)
                )}
              </div>
              <div className="min-w-0 flex-1">
                {plan.creator.username ? (
                  <Link href={`/profile/${plan.creator.username}`} className="truncate font-display text-sm text-[var(--color-ink-950)] transition hover:text-[var(--color-sea-700)] sm:text-base">
                    {plan.creator.fullName}
                  </Link>
                ) : (
                  <p className="truncate font-display text-sm text-[var(--color-ink-950)] sm:text-base">{plan.creator.fullName}</p>
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[var(--color-ink-600)] sm:text-xs">
                  {plan.creator.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {plan.creator.city}
                    </span>
                  )}
                  {(plan.creator.completedTrips ?? 0) > 0 && (
                    <span>{plan.creator.completedTrips} trips</span>
                  )}
                  {(plan.creator.avgRating ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3 fill-current text-[var(--color-sunset-400)]" />
                      {plan.creator.avgRating?.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <UserVerificationBadge tier={plan.creator.verification ?? "BASIC"} />
                </div>
              </div>
            </div>
          </Card>

          {/* Enrolled members — desktop only (mobile version shown above) */}
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Users className="size-4 text-[var(--color-sea-600)]" />
              <p className="font-display text-sm text-[var(--color-ink-950)] sm:text-base">
                Who&apos;s interested
              </p>
            </div>
            <EnrolledMembers
              members={plan.group?.members ?? []}
              maxSize={plan.groupSizeMax}
              currentSize={currentSize}
              maleCount={plan.group?.maleCount}
              femaleCount={plan.group?.femaleCount}
              otherCount={plan.group?.otherCount}
            />
          </Card>

          {/* Selected agency */}
          {hasSelectedOffer && (
            <Card className="p-4 sm:p-5">
              <span className="inline-flex items-center rounded-full bg-[var(--color-sunset-50)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
                Partnered agency
              </span>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex size-12 items-center justify-center rounded-[var(--radius-lg)] bg-gradient-to-b from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] font-display text-base text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-sm)]">
                  {initials(plan.selectedOffer!.agency.name)}
                </div>
                <div>
                  <Link
                    href={`/profile/${plan.selectedOffer!.agency.slug}`}
                    className="font-display text-base text-[var(--color-ink-950)] transition hover:text-[var(--color-sea-700)]"
                  >
                    {plan.selectedOffer!.agency.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-sm text-[var(--color-ink-600)]">
                    <Star className="size-3 fill-current text-[var(--color-sunset-500)]" />
                    {plan.selectedOffer!.agency.avgRating.toFixed(1)} · {plan.selectedOffer!.agency.totalReviews ?? 0} reviews
                  </div>
                  <div className="mt-1.5">
                    <AgencyVerificationBadge status={plan.selectedOffer!.agency.verification} />
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-[var(--color-sea-600)]" />
              <p className="font-display text-base text-[var(--color-ink-950)]">
                Safety & trust
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-600)]">
              The core protections that help travelers join with confidence.
            </p>
            <div className="mt-4 space-y-3">
              {SAFETY_TRUST_ITEMS.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-[var(--radius-md)] border border-white/40 bg-[var(--color-surface-2)] px-3.5 py-3 shadow-[var(--shadow-clay-inset)]"
                >
                  <div
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full shadow-[var(--shadow-clay-sm)] ${item.iconWrapClassName}`}
                  >
                    <item.icon className={`size-4 ${item.iconClassName}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-ink-600)]">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ═══ Sticky mobile bottom bar ═══ */}
      <MobileBottomBar
        groupId={plan.group?.id}
        price={hasSelectedOffer ? plan.selectedOffer!.pricePerPerson : plan.budgetMin ?? null}
        spotsLeft={spotsLeft}
        shareUrl={shareUrl}
        requiresFemaleProfile={plan.genderPref === "female_only"}
        label={hasSelectedOffer ? "Join this trip" : "Join this plan"}
        members={plan.group?.members ?? []}
      />
    </div>
  );
}
