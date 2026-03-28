"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Plus, Trash2 } from "lucide-react";
import { DayStepper, type DayPlan } from "@/components/trip/day-stepper";
import { Button } from "@/components/ui/button";
import { CardInset } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ItineraryDraftDay {
  id: string;
  day: string;
  title: string;
  description: string;
  highlightsText: string;
  mealsText: string;
  accommodation: string;
  transport: string;
}

export interface StructuredItineraryItem {
  day: number;
  title: string;
  description?: string | null;
  highlights?: string[] | null;
  meals?: string[] | null;
  accommodation?: string | null;
  transport?: string | null;
}

function createDraftId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `itinerary-${Math.random().toString(36).slice(2, 10)}`;
}

export function createItineraryDraftDay(
  value: Partial<Omit<ItineraryDraftDay, "id">> & { id?: string } = {},
): ItineraryDraftDay {
  return {
    id: value.id ?? createDraftId(),
    day: value.day ?? "",
    title: value.title ?? "",
    description: value.description ?? "",
    highlightsText: value.highlightsText ?? "",
    mealsText: value.mealsText ?? "",
    accommodation: value.accommodation ?? "",
    transport: value.transport ?? "",
  };
}

function parseTextList(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toInitialItineraryDraftDays(
  itinerary?: Array<StructuredItineraryItem | null | undefined> | null,
) {
  return (itinerary ?? []).map((item, index) =>
    createItineraryDraftDay({
      id: `${item?.day ?? index}-${index}`,
      day: String(item?.day ?? index + 1),
      title: item?.title ?? "",
      description: item?.description ?? "",
      highlightsText: (item?.highlights ?? []).join("\n"),
      mealsText: (item?.meals ?? []).join("\n"),
      accommodation: item?.accommodation ?? "",
      transport: item?.transport ?? "",
    }),
  );
}

export function buildStructuredItineraryPayload(itineraryDays: ItineraryDraftDay[]) {
  const payload: StructuredItineraryItem[] = [];
  const usedDays = new Set<number>();

  for (const [index, item] of itineraryDays.entries()) {
    const title = item.title.trim();
    const description = item.description.trim();
    const dayText = item.day.trim();
    const highlights = parseTextList(item.highlightsText);
    const meals = parseTextList(item.mealsText);
    const accommodation = item.accommodation.trim();
    const transport = item.transport.trim();
    const hasContent =
      title ||
      description ||
      dayText ||
      highlights.length > 0 ||
      meals.length > 0 ||
      accommodation ||
      transport;

    if (!hasContent) {
      continue;
    }

    if (!title) {
      return {
        error: `Add a headline for itinerary day ${index + 1}.`,
      };
    }

    const day = Number(dayText);

    if (!Number.isInteger(day) || day < 0) {
      return {
        error: `Use a valid day number for "${title}".`,
      };
    }

    if (usedDays.has(day)) {
      return {
        error: `Day ${day} is used more than once in the itinerary.`,
      };
    }

    usedDays.add(day);
    payload.push({
      day,
      title,
      description: description || undefined,
      highlights: highlights.length > 0 ? highlights : undefined,
      meals: meals.length > 0 ? meals : undefined,
      accommodation: accommodation || undefined,
      transport: transport || undefined,
    });
  }

  return { payload };
}

function getDisplayDay(item: Pick<ItineraryDraftDay, "day">, index: number) {
  const parsed = Number(item.day);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : index + 1;
}

function getNextDayValue(days: ItineraryDraftDay[]) {
  const previousDay = days.at(-1)?.day ?? "";
  const parsed = Number(previousDay);

  if (Number.isInteger(parsed) && parsed >= 0) {
    return String(parsed + 1);
  }

  return String(days.length + 1);
}

interface ItineraryStepperEditorProps {
  value: ItineraryDraftDay[];
  onChange: (value: ItineraryDraftDay[]) => void;
  sectionLabel?: string;
  heading?: string;
  description?: string;
  previewLabel?: string;
  previewHeading?: string;
  previewDescription?: string;
  addButtonLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyButtonLabel?: string;
}

export function ItineraryStepperEditor({
  value,
  onChange,
  sectionLabel = "Tour itinerary",
  heading = "Build the trip day by day",
  description = "Use separate fields for the daily overview, highlights, stay, transfers, and meals so travelers know exactly what to expect.",
  previewLabel = "Traveler preview",
  previewHeading = "How the itinerary will read",
  previewDescription = "The public trip view updates as you write.",
  addButtonLabel = "Add day",
  emptyTitle = "No itinerary days yet",
  emptyDescription = "Add the first stop so travelers can understand the flow of the trip.",
  emptyButtonLabel = "Add first day",
}: ItineraryStepperEditorProps) {
  const previewDays = useMemo<DayPlan[]>(
    () =>
      value
        .filter(
          (item) =>
            item.title.trim() ||
            item.description.trim() ||
            item.highlightsText.trim() ||
            item.mealsText.trim() ||
            item.accommodation.trim() ||
            item.transport.trim(),
        )
        .map((item, index) => ({
          day: getDisplayDay(item, index),
          title: item.title.trim() || `Day ${getDisplayDay(item, index)}`,
          description: item.description.trim() || undefined,
          highlights: parseTextList(item.highlightsText),
          meals: parseTextList(item.mealsText),
          accommodation: item.accommodation.trim() || undefined,
          transport: item.transport.trim() || undefined,
        })),
    [value],
  );

  function updateDay(id: string, patch: Partial<ItineraryDraftDay>) {
    onChange(value.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addDay() {
    onChange([...value, createItineraryDraftDay({ day: getNextDayValue(value) })]);
  }

  function removeDay(id: string) {
    onChange(value.filter((item) => item.id !== id));
  }

  function moveDay(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= value.length) {
      return;
    }

    const next = [...value];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-sea-700)]">
              {sectionLabel}
            </p>
            <h4 className="mt-1 font-display text-lg text-[var(--color-ink-950)]">
              {heading}
            </h4>
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-600)]">
              {description}
            </p>
          </div>
          <Button type="button" variant="soft" size="sm" onClick={addDay}>
            <Plus className="size-4" />
            {addButtonLabel}
          </Button>
        </div>

        <CardInset className="grid gap-3 border-[var(--color-sea-100)] bg-[var(--color-sea-50)]/60 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Overview", "Use this for the main story or schedule of the day."],
            ["Highlights", "One activity, stop, or experience per line."],
            ["Stay", "Hotel, campsite, city, or overnight arrangement."],
            ["Transfers", "Pickup, train, cab, coach, flight, or local movement."],
            ["Meals", "Breakfast, lunch, dinner, snacks, or meal plan notes."],
          ].map(([title, detail]) => (
            <div key={title} className="space-y-1 rounded-[var(--radius-sm)] bg-white/70 px-3 py-2.5 shadow-[var(--shadow-clay-sm)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-sea-700)]">
                {title}
              </p>
              <p className="text-xs leading-relaxed text-[var(--color-ink-600)]">{detail}</p>
            </div>
          ))}
        </CardInset>

        {value.length === 0 ? (
          <CardInset className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-200)] shadow-[var(--shadow-clay-sm)]">
              <CalendarDays className="size-6 text-[var(--color-sea-700)]" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-lg text-[var(--color-ink-950)]">{emptyTitle}</p>
              <p className="text-sm text-[var(--color-ink-600)]">
                {emptyDescription}
              </p>
            </div>
            <Button type="button" size="sm" onClick={addDay}>
              <Plus className="size-4" />
              {emptyButtonLabel}
            </Button>
          </CardInset>
        ) : (
          <div className="relative pl-14">
            <div className="absolute left-[21px] top-5 bottom-5 w-px rounded-full bg-gradient-to-b from-[var(--color-sea-300)] via-[var(--color-sea-200)] to-[var(--color-sea-100)]" />

            <div className="space-y-4">
              {value.map((item, index) => {
                const displayDay = getDisplayDay(item, index);

                return (
                  <div key={item.id} className="relative">
                    <div className="absolute -left-14 top-6 flex size-11 items-center justify-center rounded-full border-2 border-[var(--color-sea-200)] bg-gradient-to-b from-[var(--color-sea-400)] to-[var(--color-sea-600)] text-sm font-bold text-white shadow-[var(--shadow-clay-sea)]">
                      {displayDay}
                    </div>

                    <CardInset className="space-y-4 border-[var(--color-sea-100)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,251,248,0.98))] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-ink-500)]">
                            Day {displayDay}
                          </p>
                          <p className="mt-1 text-sm text-[var(--color-ink-600)]">
                            {item.title.trim() || "Add a short headline and the key moments for this day."}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveDay(index, -1)}
                            disabled={index === 0}
                            className={cn(
                              "flex size-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-[var(--color-ink-500)] shadow-[var(--shadow-clay-sm)] transition-all",
                              "hover:-translate-y-0.5 hover:text-[var(--color-sea-700)] disabled:cursor-not-allowed disabled:opacity-40",
                            )}
                            aria-label={`Move Day ${displayDay} up`}
                            title="Move up"
                          >
                            <ArrowUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDay(index, 1)}
                            disabled={index === value.length - 1}
                            className={cn(
                              "flex size-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-[var(--color-ink-500)] shadow-[var(--shadow-clay-sm)] transition-all",
                              "hover:-translate-y-0.5 hover:text-[var(--color-sea-700)] disabled:cursor-not-allowed disabled:opacity-40",
                            )}
                            aria-label={`Move Day ${displayDay} down`}
                            title="Move down"
                          >
                            <ArrowDown className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeDay(item.id)}
                            className={cn(
                              "flex size-9 items-center justify-center rounded-full border border-white/60 bg-white/70 text-[var(--color-ink-500)] shadow-[var(--shadow-clay-sm)] transition-all",
                              "hover:-translate-y-0.5 hover:text-[var(--color-sunset-700)]",
                            )}
                            aria-label={`Remove Day ${displayDay}`}
                            title="Remove day"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-[130px_1fr]">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                            Day number
                          </label>
                          <Input
                            type="number"
                            min={0}
                            value={item.day}
                            onChange={(event) => updateDay(item.id, { day: event.target.value })}
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                            Headline
                          </label>
                          <Input
                            value={item.title}
                            onChange={(event) => updateDay(item.id, { title: event.target.value })}
                            placeholder="Touchdown in Tokyo and crew meet-up"
                          />
                        </div>
                      </div>

                      <div>
                          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                            Day overview
                          </label>
                          <Textarea
                            value={item.description}
                            onChange={(event) => updateDay(item.id, { description: event.target.value })}
                            className="min-h-24"
                            placeholder="Write the overall flow of the day: arrival, sightseeing, downtime, major movements, and the key story travelers should remember."
                          />
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <label className="block text-sm font-medium text-[var(--color-ink-700)]">
                              Highlights / activities
                            </label>
                            <span className="text-[11px] text-[var(--color-ink-500)]">One item per line</span>
                          </div>
                          <Textarea
                            value={item.highlightsText}
                            onChange={(event) => updateDay(item.id, { highlightsText: event.target.value })}
                            className="min-h-28"
                            placeholder={"Arrival transfer to hotel\nEvening market walk\nSunset viewpoint stop"}
                          />
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <label className="block text-sm font-medium text-[var(--color-ink-700)]">
                              Meals
                            </label>
                            <span className="text-[11px] text-[var(--color-ink-500)]">One item per line</span>
                          </div>
                          <Textarea
                            value={item.mealsText}
                            onChange={(event) => updateDay(item.id, { mealsText: event.target.value })}
                            className="min-h-28"
                            placeholder={"Breakfast included\nDinner at local cafe"}
                          />
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                            Stay
                          </label>
                          <Input
                            value={item.accommodation}
                            onChange={(event) => updateDay(item.id, { accommodation: event.target.value })}
                            placeholder="Boutique hotel in Old Town"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-[var(--color-ink-700)]">
                            Transfers
                          </label>
                          <Input
                            value={item.transport}
                            onChange={(event) => updateDay(item.id, { transport: event.target.value })}
                            placeholder="Airport pickup and private cab between attractions"
                          />
                        </div>
                      </div>
                    </CardInset>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <CardInset className="h-fit space-y-4 xl:sticky xl:top-24">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-200)] shadow-[var(--shadow-clay-sm)]">
            <CalendarDays className="size-5 text-[var(--color-sea-700)]" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-sea-700)]">
              {previewLabel}
            </p>
            <h4 className="mt-1 font-display text-lg text-[var(--color-ink-950)]">
              {previewHeading}
            </h4>
            <p className="mt-1 text-sm text-[var(--color-ink-600)]">
              {previewDescription}
            </p>
          </div>
        </div>

        <DayStepper days={previewDays} totalDays={previewDays.length || value.length} />
      </CardInset>
    </div>
  );
}
