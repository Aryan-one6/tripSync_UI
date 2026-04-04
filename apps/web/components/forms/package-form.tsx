"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreatePackageSchema } from "@tripsync/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ChipGroup } from "@/components/ui/chip-group";
import { ImageUpload } from "@/components/ui/image-upload";
import { Stepper } from "@/components/ui/stepper";
import {
  ItineraryStepperEditor,
  buildStructuredItineraryPayload,
  toInitialItineraryDraftDays,
  type ItineraryDraftDay,
} from "@/components/forms/itinerary-stepper-editor";
import { useAuth } from "@/lib/auth/auth-context";
import { ACTIVITY_OPTIONS, VIBE_OPTIONS } from "@/lib/constants";
import type { PackageDetails } from "@/lib/api/types";
import { MapPin, ListChecks, Sparkles, Settings2 } from "lucide-react";

interface PackageFormValues {
  title: string;
  destination: string;
  destinationState: string;
  startDate: string;
  endDate: string;
  departureDates: string;
  basePrice: string;
  groupSizeMin: string;
  groupSizeMax: string;
  itineraryDays: ItineraryDraftDay[];
  exclusions: string;
  accommodation: string;
  cancellationPolicy: string;
  galleryUrls: string[];
  meals: string;
  transport: boolean;
  stayIncluded: boolean;
  vibes: string[];
  activities: string[];
  publishNow: boolean;
}

const formSteps = [
  { key: "basics", title: "Basics", description: "Title, location & pricing", icon: <MapPin className="size-5" /> },
  { key: "itinerary", title: "Itinerary", description: "Day plan & inclusions", icon: <ListChecks className="size-5" /> },
  { key: "vibes", title: "Style", description: "Vibes, activities & policy", icon: <Sparkles className="size-5" /> },
  { key: "media", title: "Media", description: "Gallery & publish", icon: <Settings2 className="size-5" /> },
];

function toIsoDate(value: string) {
  if (!value) return undefined;
  return new Date(`${value}T09:00:00`).toISOString();
}

function parseLines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function toInitialState(initialData?: PackageDetails | null): PackageFormValues {
  return {
    title: initialData?.title ?? "",
    destination: initialData?.destination ?? "",
    destinationState: initialData?.destinationState ?? "",
    startDate: initialData?.startDate?.slice(0, 10) ?? "",
    endDate: initialData?.endDate?.slice(0, 10) ?? "",
    departureDates: (initialData?.departureDates ?? []).map((date) => date.slice(0, 10)).join("\n"),
    basePrice: String(initialData?.basePrice ?? 18000),
    groupSizeMin: String(initialData?.groupSizeMin ?? 4),
    groupSizeMax: String(initialData?.groupSizeMax ?? 14),
    itineraryDays: toInitialItineraryDraftDays(initialData?.itinerary),
    exclusions: initialData?.exclusions ?? "",
    accommodation: initialData?.accommodation ?? "",
    cancellationPolicy: initialData?.cancellationPolicy ?? "",
    galleryUrls: initialData?.galleryUrls ?? [],
    meals: String((initialData?.inclusions as { meals?: string } | null)?.meals ?? ""),
    transport: Boolean((initialData?.inclusions as { transport?: boolean } | null)?.transport),
    stayIncluded: Boolean((initialData?.inclusions as { accommodation?: boolean } | null)?.accommodation),
    vibes: initialData?.vibes ?? ["Adventure"],
    activities: initialData?.activities ?? ["Trekking"],
    publishNow: initialData?.status === "OPEN",
  };
}

export function PackageForm({
  mode,
  packageId,
  initialData,
}: {
  mode: "create" | "edit";
  packageId?: string;
  initialData?: PackageDetails | null;
}) {
  const router = useRouter();
  const { apiFetchWithAuth } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<PackageFormValues>(() => toInitialState(initialData));

  useEffect(() => {
    setValues(toInitialState(initialData));
  }, [initialData]);

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

  function submit() {
    startTransition(async () => {
      try {
        const itineraryResult = buildStructuredItineraryPayload(values.itineraryDays);

        if ("error" in itineraryResult) {
          setFeedback(itineraryResult.error ?? "Unable to build itinerary.");
          return;
        }
        if (values.galleryUrls.length === 0) {
          setFeedback("Add at least one package image before saving.");
          return;
        }

        const payload = CreatePackageSchema.parse({
          title: values.title,
          destination: values.destination,
          destinationState: values.destinationState || undefined,
          startDate: toIsoDate(values.startDate),
          endDate: toIsoDate(values.endDate),
          departureDates: parseLines(values.departureDates).map((date) => toIsoDate(date)!).filter(Boolean),
          basePrice: Number(values.basePrice),
          groupSizeMin: Number(values.groupSizeMin),
          groupSizeMax: Number(values.groupSizeMax),
          itinerary: itineraryResult.payload.length > 0 ? itineraryResult.payload : undefined,
          inclusions: {
            meals: values.meals || undefined,
            transport: values.transport,
            accommodation: values.stayIncluded,
            activities: values.activities,
          },
          exclusions: values.exclusions || undefined,
          accommodation: values.accommodation || undefined,
          vibes: values.vibes,
          activities: values.activities,
          galleryUrls: values.galleryUrls,
          cancellationPolicy: values.cancellationPolicy || undefined,
        });

        const response = await apiFetchWithAuth<{ id: string }>(
          mode === "create" ? "/packages" : `/packages/${packageId}`,
          { method: mode === "create" ? "POST" : "PATCH", body: JSON.stringify(payload) },
        );

        if (values.publishNow) {
          await apiFetchWithAuth(`/packages/${response.id}/publish`, { method: "POST" });
        }

        router.push(mode === "create" ? "/dashboard" : "/bids");
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Unable to save package.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <Card className="p-4 sm:p-6">
        <Stepper
          steps={formSteps}
          currentStep={step}
          onStepClick={(i) => { if (i < step) setStep(i); }}
        />
      </Card>

      {/* Step content */}
      <Card className="p-5 sm:p-7">
        <div className="space-y-6">
          {/* Step 1: Basics */}
          {step === 0 && (
            <div className="space-y-5 animate-rise-in">
              <div>
                <h3 className="font-display text-xl text-[var(--color-ink-950)]">Package basics</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">Core details about your travel package</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Package title</label>
                  <Input
                    value={values.title}
                    onChange={(e) => setValues((c) => ({ ...c, title: e.target.value }))}
                    placeholder="Weekend Bir landing sprint"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Destination</label>
                  <Input value={values.destination} onChange={(e) => setValues((c) => ({ ...c, destination: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">State</label>
                  <Input value={values.destinationState} onChange={(e) => setValues((c) => ({ ...c, destinationState: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Start date</label>
                  <Input type="date" value={values.startDate} onChange={(e) => setValues((c) => ({ ...c, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">End date</label>
                  <Input type="date" value={values.endDate} onChange={(e) => setValues((c) => ({ ...c, endDate: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Base price (INR)</label>
                  <Input type="number" value={values.basePrice} onChange={(e) => setValues((c) => ({ ...c, basePrice: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Min pax</label>
                    <Input type="number" value={values.groupSizeMin} onChange={(e) => setValues((c) => ({ ...c, groupSizeMin: e.target.value }))} />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Max pax</label>
                    <Input type="number" value={values.groupSizeMax} onChange={(e) => setValues((c) => ({ ...c, groupSizeMax: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Itinerary & Inclusions */}
          {step === 1 && (
            <div className="space-y-5 animate-rise-in">
              <div>
                <h3 className="font-display text-xl text-[var(--color-ink-950)]">Itinerary & inclusions</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">Day-wise plan, highlights, stay, meals, and transfers</p>
              </div>

              <ItineraryStepperEditor
                value={values.itineraryDays}
                onChange={(itineraryDays) => setValues((current) => ({ ...current, itineraryDays }))}
                sectionLabel="Tour itinerary"
                heading="Build the package story day by day"
                description="Spell out the full flow of the trip. Use the overview for the narrative, highlights for sightseeing and activities, stay for hotels or overnight cities, transfers for movement, and meals for inclusions."
                previewLabel="Package preview"
                previewHeading="What travelers will read"
                previewDescription="This mirrors the detailed itinerary block on the public package page."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Accommodation</label>
                  <Input value={values.accommodation} onChange={(e) => setValues((c) => ({ ...c, accommodation: e.target.value }))} placeholder="Boutique stay with breakfast" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Meals</label>
                  <Input value={values.meals} onChange={(e) => setValues((c) => ({ ...c, meals: e.target.value }))} placeholder="Breakfast + 1 dinner" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Departure dates (one per line)</label>
                <Textarea
                  value={values.departureDates}
                  onChange={(e) => setValues((c) => ({ ...c, departureDates: e.target.value }))}
                  placeholder={"2026-05-15\n2026-05-22"}
                  className="min-h-20"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle
                  checked={values.transport}
                  onChange={(checked) => setValues((c) => ({ ...c, transport: checked }))}
                  label="Transport included"
                  description="Covers travel between activities"
                />
                <Toggle
                  checked={values.stayIncluded}
                  onChange={(checked) => setValues((c) => ({ ...c, stayIncluded: checked }))}
                  label="Stay included"
                  description="Accommodation is part of the package"
                />
              </div>
            </div>
          )}

          {/* Step 3: Vibes & Policy */}
          {step === 2 && (
            <div className="space-y-6 animate-rise-in">
              <div>
                <h3 className="font-display text-xl text-[var(--color-ink-950)]">Style & policies</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">Help travelers find their match</p>
              </div>

              <ChipGroup label="Vibes" options={VIBE_OPTIONS} selected={values.vibes} onToggle={(v) => toggleArrayValue("vibes", v)} variant="sea" />
              <ChipGroup label="Activities" options={ACTIVITY_OPTIONS} selected={values.activities} onToggle={(v) => toggleArrayValue("activities", v)} variant="sunset" />

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Cancellation policy</label>
                <Textarea value={values.cancellationPolicy} onChange={(e) => setValues((c) => ({ ...c, cancellationPolicy: e.target.value }))} placeholder="Describe your cancellation terms..." />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">Exclusions</label>
                <Textarea value={values.exclusions} onChange={(e) => setValues((c) => ({ ...c, exclusions: e.target.value }))} placeholder="What is not included in the price..." />
              </div>
            </div>
          )}

          {/* Step 4: Media & Publish */}
          {step === 3 && (
            <div className="space-y-6 animate-rise-in">
              <div>
                <h3 className="font-display text-xl text-[var(--color-ink-950)]">Gallery & publish</h3>
                <p className="mt-1 text-sm text-[var(--color-ink-600)]">Add photos and make it live</p>
              </div>

              <ImageUpload
                label="Package gallery"
                value={values.galleryUrls}
                onChange={(urls) => setValues((c) => ({ ...c, galleryUrls: urls }))}
                max={8}
              />
              <p className="text-xs text-[var(--color-ink-500)]">
                Add at least one image. The first image is used on discover cards.
              </p>

              <Toggle
                checked={values.publishNow}
                onChange={(checked) => setValues((c) => ({ ...c, publishNow: checked }))}
                label="Publish immediately"
                description="Make your package visible to travelers"
              />
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
            {step < formSteps.length - 1 ? (
              <Button type="button" onClick={() => setStep((c) => c + 1)}>
                Continue
              </Button>
            ) : (
              <Button type="button" onClick={submit} disabled={isPending}>
                {isPending ? "Saving..." : mode === "create" ? "Save package" : "Update package"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
