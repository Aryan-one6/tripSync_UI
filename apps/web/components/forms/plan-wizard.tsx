"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreatePlanSchema } from "@tripsync/shared";
import { MapPin, Wallet, Sparkles, Eye, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Stepper } from "@/components/ui/stepper";
import { ChipGroup } from "@/components/ui/chip-group";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ImageUpload } from "@/components/ui/image-upload";
import { Badge } from "@/components/ui/badge";
import { DayStepper, type DayPlan } from "@/components/trip/day-stepper";
import {
  ItineraryStepperEditor,
  buildStructuredItineraryPayload,
  type ItineraryDraftDay,
} from "@/components/forms/itinerary-stepper-editor";
import {
  ACCOMMODATION_OPTIONS,
  ACTIVITY_OPTIONS,
  GENDER_PREF_OPTIONS,
  GROUP_TYPE_OPTIONS,
  VIBE_OPTIONS,
} from "@/lib/constants";
import { useAuth } from "@/lib/auth/auth-context";
import { formatCurrency } from "@/lib/format";

interface PlanWizardValues {
  title: string;
  destination: string;
  destinationState: string;
  startDate: string;
  endDate: string;
  isDateFlexible: boolean;
  budgetMin: string;
  budgetMax: string;
  groupSizeMin: string;
  groupSizeMax: string;
  vibes: string[];
  accommodation: "hostel" | "budget" | "premium" | "camping";
  groupType: "friends" | "couples" | "solo" | "family" | "female_only";
  genderPref: "open" | "female_only" | "balanced";
  activities: string[];
  description: string;
  itineraryDays: ItineraryDraftDay[];
  galleryUrls: string[];
  autoApprove: boolean;
  publishNow: boolean;
}

const steps = [
  { key: "where", title: "Where & When", description: "Destination & dates", icon: <MapPin className="size-5" /> },
  { key: "budget", title: "Budget & Size", description: "Pricing & group", icon: <Wallet className="size-5" /> },
  { key: "vibe", title: "Trip Vibe", description: "Style & activities", icon: <Sparkles className="size-5" /> },
  { key: "itinerary", title: "Tour Brief", description: "Day plan & details", icon: <Route className="size-5" /> },
  { key: "preview", title: "Preview", description: "Review & publish", icon: <Eye className="size-5" /> },
];

function toIsoDate(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T09:00:00`).toISOString();
}

export function PlanWizard() {
  const router = useRouter();
  const { apiFetchWithAuth } = useAuth();
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<PlanWizardValues>({
    title: "",
    destination: "",
    destinationState: "",
    startDate: "",
    endDate: "",
    isDateFlexible: false,
    budgetMin: "12000",
    budgetMax: "22000",
    groupSizeMin: "4",
    groupSizeMax: "12",
    vibes: ["Adventure"],
    accommodation: "hostel",
    groupType: "friends",
    genderPref: "open",
    activities: ["Trekking"],
    description: "",
    itineraryDays: [],
    galleryUrls: [],
    autoApprove: true,
    publishNow: true,
  });

  const itineraryPreview = useMemo<DayPlan[]>(() => {
    const itineraryResult = buildStructuredItineraryPayload(values.itineraryDays);
    if ("error" in itineraryResult) {
      return [];
    }

    return itineraryResult.payload.map((item) => ({
      day: item.day,
      title: item.title,
      description: item.description ?? undefined,
      highlights: item.highlights ?? undefined,
      meals: item.meals ?? undefined,
      accommodation: item.accommodation ?? undefined,
      transport: item.transport ?? undefined,
    }));
  }, [values.itineraryDays]);

  const generatedTitle = useMemo(() => {
    if (!values.destination) return "My next TripSync plan";
    return `${values.destination} social trip`;
  }, [values.destination]);

  function toggleArrayValue(field: "vibes" | "activities", value: string) {
    setValues((current) => {
      const exists = current[field].includes(value);
      return {
        ...current,
        [field]: exists
          ? current[field].filter((item) => item !== value)
          : [...current[field], value],
      };
    });
  }

  function validateCurrentStep() {
    if (step === 0 && !values.destination) {
      setFeedback("Destination is required to start a plan.");
      return false;
    }

    if (step === 1 && Number(values.groupSizeMin) > Number(values.groupSizeMax)) {
      setFeedback("Minimum group size cannot exceed the maximum.");
      return false;
    }

    if (step === 3) {
      const itineraryResult = buildStructuredItineraryPayload(values.itineraryDays);
      if ("error" in itineraryResult) {
        setFeedback(itineraryResult.error ?? "Requested itinerary is incomplete.");
        return false;
      }
    }

    if (step === 4) {
      try {
        const itineraryResult = buildStructuredItineraryPayload(values.itineraryDays);
        if ("error" in itineraryResult) {
          setFeedback(itineraryResult.error ?? "Requested itinerary is incomplete.");
          return false;
        }

        CreatePlanSchema.parse({
          title: values.title || generatedTitle,
          destination: values.destination,
          destinationState: values.destinationState || undefined,
          startDate: toIsoDate(values.startDate),
          endDate: toIsoDate(values.endDate),
          isDateFlexible: values.isDateFlexible,
          budgetMin: Number(values.budgetMin),
          budgetMax: Number(values.budgetMax),
          groupSizeMin: Number(values.groupSizeMin),
          groupSizeMax: Number(values.groupSizeMax),
          vibes: values.vibes,
          accommodation: values.accommodation,
          groupType: values.groupType,
          genderPref: values.genderPref,
          activities: values.activities,
          description: values.description || undefined,
          itinerary: itineraryResult.payload.length > 0 ? itineraryResult.payload : undefined,
          galleryUrls: values.galleryUrls.length > 0 ? values.galleryUrls : undefined,
          coverImageUrl: values.galleryUrls[0] || undefined,
          autoApprove: values.autoApprove,
        });
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Plan validation failed.");
        return false;
      }
    }

    setFeedback(null);
    return true;
  }

  function submitPlan() {
    startTransition(async () => {
      try {
        const itineraryResult = buildStructuredItineraryPayload(values.itineraryDays);

        if ("error" in itineraryResult) {
          setFeedback(itineraryResult.error ?? "Requested itinerary is incomplete.");
          return;
        }

        const payload = CreatePlanSchema.parse({
          title: values.title || generatedTitle,
          destination: values.destination,
          destinationState: values.destinationState || undefined,
          startDate: toIsoDate(values.startDate),
          endDate: toIsoDate(values.endDate),
          isDateFlexible: values.isDateFlexible,
          budgetMin: Number(values.budgetMin),
          budgetMax: Number(values.budgetMax),
          groupSizeMin: Number(values.groupSizeMin),
          groupSizeMax: Number(values.groupSizeMax),
          vibes: values.vibes,
          accommodation: values.accommodation,
          groupType: values.groupType,
          genderPref: values.genderPref,
          activities: values.activities,
          description: values.description || undefined,
          itinerary: itineraryResult.payload.length > 0 ? itineraryResult.payload : undefined,
          galleryUrls: values.galleryUrls.length > 0 ? values.galleryUrls : undefined,
          coverImageUrl: values.galleryUrls[0] || undefined,
          autoApprove: values.autoApprove,
        });

        const created = await apiFetchWithAuth<{ id: string }>("/plans", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (values.publishNow) {
          await apiFetchWithAuth(`/plans/${created.id}/publish`, { method: "POST" });
        }

        router.push("/dashboard/plans");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to create plan.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card className="p-4 sm:p-6">
        <Stepper
          steps={steps}
          currentStep={step}
          onStepClick={(index) => {
            if (index < step) setStep(index);
          }}
        />
      </Card>

      {/* Step content */}
      <Card className="p-5 sm:p-7">
        <div className="space-y-6">
          {/* Step 1: Where & When */}
          {step === 0 && (
            <div className="space-y-5 animate-rise-in">
              <div>
                <h3 className="font-display text-xl text-[var(--color-ink-950)]">Where are you headed?</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">Tell us about your dream destination</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Destination
                  </label>
                  <Input
                    value={values.destination}
                    onChange={(e) => setValues((c) => ({ ...c, destination: e.target.value }))}
                    placeholder="Bir, Kasol, Goa..."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    State
                  </label>
                  <Input
                    value={values.destinationState}
                    onChange={(e) => setValues((c) => ({ ...c, destinationState: e.target.value }))}
                    placeholder="Himachal Pradesh"
                  />
                </div>
                <div>
                  <Toggle
                    checked={values.isDateFlexible}
                    onChange={(checked) => setValues((c) => ({ ...c, isDateFlexible: checked }))}
                    label="Flexible dates"
                    description="Open to adjusting travel dates"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Start date
                  </label>
                  <Input
                    type="date"
                    value={values.startDate}
                    onChange={(e) => setValues((c) => ({ ...c, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    End date
                  </label>
                  <Input
                    type="date"
                    value={values.endDate}
                    onChange={(e) => setValues((c) => ({ ...c, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Budget & Size */}
          {step === 1 && (
            <div className="space-y-5 animate-rise-in">
              <div>
                <h3 className="font-display text-xl text-[var(--color-ink-950)]">Set your budget & group size</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">Help travelers know what to expect</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Budget min (INR)
                  </label>
                  <Input
                    type="number"
                    value={values.budgetMin}
                    onChange={(e) => setValues((c) => ({ ...c, budgetMin: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Budget max (INR)
                  </label>
                  <Input
                    type="number"
                    value={values.budgetMax}
                    onChange={(e) => setValues((c) => ({ ...c, budgetMax: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Group min
                  </label>
                  <Input
                    type="number"
                    value={values.groupSizeMin}
                    onChange={(e) => setValues((c) => ({ ...c, groupSizeMin: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Group max
                  </label>
                  <Input
                    type="number"
                    value={values.groupSizeMax}
                    onChange={(e) => setValues((c) => ({ ...c, groupSizeMax: e.target.value }))}
                  />
                </div>
              </div>

              {/* Budget preview */}
              {values.budgetMin && values.budgetMax && (
                <CardInset className="flex items-center justify-between">
                  <span className="text-sm text-[var(--color-ink-600)]">Budget range</span>
                  <span className="font-display text-lg text-[var(--color-sea-700)]">
                    {formatCurrency(Number(values.budgetMin))} – {formatCurrency(Number(values.budgetMax))}
                  </span>
                </CardInset>
              )}
            </div>
          )}

          {/* Step 3: Trip Vibe */}
          {step === 2 && (
            <div className="space-y-6 animate-rise-in">
              <div>
                <h3 className="font-display text-xl text-[var(--color-ink-950)]">What is the vibe?</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">Set the mood for your trip</p>
              </div>

              <ChipGroup
                label="Vibes"
                options={VIBE_OPTIONS}
                selected={values.vibes}
                onToggle={(v) => toggleArrayValue("vibes", v)}
                variant="sea"
              />

              <ChipGroup
                label="Activities"
                options={ACTIVITY_OPTIONS}
                selected={values.activities}
                onToggle={(v) => toggleArrayValue("activities", v)}
                variant="sunset"
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Accommodation
                  </label>
                  <Select
                    value={values.accommodation}
                    onChange={(e) => setValues((c) => ({ ...c, accommodation: e.target.value as PlanWizardValues["accommodation"] }))}
                    options={ACCOMMODATION_OPTIONS}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Group type
                  </label>
                  <Select
                    value={values.groupType}
                    onChange={(e) => setValues((c) => ({ ...c, groupType: e.target.value as PlanWizardValues["groupType"] }))}
                    options={GROUP_TYPE_OPTIONS}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                    Gender preference
                  </label>
                  <Select
                    value={values.genderPref}
                    onChange={(e) => setValues((c) => ({ ...c, genderPref: e.target.value as PlanWizardValues["genderPref"] }))}
                    options={GENDER_PREF_OPTIONS}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Tour Brief */}
          {step === 3 && (
            <div className="space-y-6 animate-rise-in">
              <div>
                <h3 className="font-display text-xl text-[var(--color-ink-950)]">What should the trip feel like day by day?</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">
                  Give agencies and future travelers a clear requested itinerary instead of hiding everything inside one description box.
                </p>
              </div>

              <ItineraryStepperEditor
                value={values.itineraryDays}
                onChange={(itineraryDays) => setValues((current) => ({ ...current, itineraryDays }))}
                sectionLabel="Requested itinerary"
                heading="Show the kind of trip you want agencies to build"
                description="Add each day or stop with the expected flow, must-do activities, preferred stay, transfers, and meal expectations. This becomes the brief agencies respond to."
                previewLabel="Plan preview"
                previewHeading="How your trip brief will read"
                previewDescription="Travelers and agencies will see this structure instead of a vague wall of text."
                addButtonLabel="Add day or stop"
                emptyTitle="No requested itinerary yet"
                emptyDescription="Add a day-by-day brief so agencies understand exactly what kind of trip you want."
                emptyButtonLabel="Add first day"
              />
            </div>
          )}

          {/* Step 5: Preview & Publish */}
          {step === 4 && (
            <div className="space-y-6 animate-rise-in">
              <div>
                <h3 className="font-display text-xl text-[var(--color-ink-950)]">Almost there!</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">Add final touches and publish</p>
              </div>

              <div className="space-y-3">
                <ImageUpload
                  label="Trip gallery"
                  value={values.galleryUrls}
                  onChange={(galleryUrls) => setValues((c) => ({ ...c, galleryUrls }))}
                  max={8}
                />
                <p className="text-xs text-[var(--color-ink-500)]">
                  The first image becomes the cover on discovery cards and the plan page.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                  Trip title
                </label>
                <Input
                  value={values.title}
                  onChange={(e) => setValues((c) => ({ ...c, title: e.target.value }))}
                  placeholder={generatedTitle}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                  Trip overview
                </label>
                <Textarea
                  value={values.description}
                  onChange={(e) => setValues((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Write the high-level pitch for this trip: the vibe, who it is for, and why people should join. Use the Tour Brief step for day-by-day detail."
                />
              </div>

              {itineraryPreview.length > 0 && (
                <CardInset className="space-y-4 border-[var(--color-sea-100)]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-500)]">
                      Requested itinerary preview
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-ink-600)]">
                      This is the detailed brief agencies and travelers will review.
                    </p>
                  </div>
                  <DayStepper days={itineraryPreview} totalDays={itineraryPreview.length} />
                </CardInset>
              )}

              {/* Preview summary */}
              <CardInset>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-ink-500)]">
                  Trip Summary
                </p>
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-600)]">Destination</span>
                    <span className="font-medium text-[var(--color-ink-900)]">{values.destination || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-600)]">Budget</span>
                    <span className="font-medium text-[var(--color-ink-900)]">
                      {formatCurrency(Number(values.budgetMin))} – {formatCurrency(Number(values.budgetMax))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-600)]">Group</span>
                    <span className="font-medium text-[var(--color-ink-900)]">{values.groupSizeMin}–{values.groupSizeMax} people</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-600)]">Accommodation</span>
                    <span className="font-medium text-[var(--color-ink-900)] capitalize">{values.accommodation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-600)]">Requested days</span>
                    <span className="font-medium text-[var(--color-ink-900)]">{itineraryPreview.length || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-ink-600)]">Photos</span>
                    <span className="font-medium text-[var(--color-ink-900)]">{values.galleryUrls.length || "—"}</span>
                  </div>
                </div>
                {values.vibes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {values.vibes.map((v) => (
                      <Badge key={v} variant="sea">{v}</Badge>
                    ))}
                    {values.activities.map((a) => (
                      <Badge key={a} variant="sunset">{a}</Badge>
                    ))}
                  </div>
                )}
              </CardInset>

              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle
                  checked={values.autoApprove}
                  onChange={(checked) => setValues((c) => ({ ...c, autoApprove: checked }))}
                  label="Auto-approve members"
                  description="New members join without manual approval"
                />
                <Toggle
                  checked={values.publishNow}
                  onChange={(checked) => setValues((c) => ({ ...c, publishNow: checked }))}
                  label="Publish immediately"
                  description="Make your plan visible right away"
                />
              </div>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <div className="rounded-[var(--radius-md)] bg-[var(--color-sunset-50)] p-3 text-sm text-[var(--color-sunset-700)] shadow-[var(--shadow-clay-inset)]">
              {feedback}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((c) => Math.max(0, c - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button
                type="button"
                onClick={() => {
                  if (validateCurrentStep()) setStep((c) => c + 1);
                }}
              >
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={submitPlan} disabled={isPending}>
                {isPending ? "Saving..." : values.publishNow ? "Publish plan" : "Save draft"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
