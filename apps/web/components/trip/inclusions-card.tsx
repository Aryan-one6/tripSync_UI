import {
  Check,
  X,
  Bus,
  UtensilsCrossed,
  Ticket,
  Bed,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InclusionsCardProps {
  inclusions?: Record<string, unknown> | null;
  exclusions?: string | null;
}

const INCLUSION_ICONS: Record<string, React.ElementType> = {
  transport: Bus,
  meals: UtensilsCrossed,
  activities: Ticket,
  accommodation: Bed,
  sightseeing: Landmark,
};

function flattenInclusions(inclusions: Record<string, unknown>): string[] {
  const items: string[] = [];
  for (const [, value] of Object.entries(inclusions)) {
    if (typeof value === "string") {
      items.push(value);
    } else if (Array.isArray(value)) {
      items.push(...value.filter((v): v is string => typeof v === "string"));
    } else if (typeof value === "boolean" && value) {
      // skip booleans handled by icon display
    }
  }
  return items;
}

function parseExclusions(exclusions: string): string[] {
  return exclusions
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function InclusionsCard({ inclusions, exclusions }: InclusionsCardProps) {
  const inclusionItems = inclusions ? flattenInclusions(inclusions) : [];
  const exclusionItems = exclusions ? parseExclusions(exclusions) : [];

  if (inclusionItems.length === 0 && exclusionItems.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] p-5 text-center shadow-[var(--shadow-clay-inset)]">
        <p className="text-sm text-[var(--color-ink-500)]">
          Inclusions & exclusions will be shared by the agency.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Inclusions */}
      {inclusionItems.length > 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-sea-100)] bg-gradient-to-br from-[var(--color-sea-50)]/50 to-white p-5 shadow-[var(--shadow-clay-sm)]">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-[var(--color-sea-600)] shadow-[var(--shadow-clay-sm)]">
              <Check className="size-3.5 text-white" />
            </div>
            <p className="font-display text-base text-[var(--color-ink-950)]">
              What&apos;s included
            </p>
          </div>
          <ul className="space-y-2">
            {inclusionItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[var(--color-ink-700)]">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--color-sea-500)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Exclusions */}
      {exclusionItems.length > 0 && (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-sunset-100)] bg-gradient-to-br from-[var(--color-sunset-50)]/50 to-white p-5 shadow-[var(--shadow-clay-sm)]">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-[var(--color-sunset-600)] shadow-[var(--shadow-clay-sm)]">
              <X className="size-3.5 text-white" />
            </div>
            <p className="font-display text-base text-[var(--color-ink-950)]">
              Not included
            </p>
          </div>
          <ul className="space-y-2">
            {exclusionItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[var(--color-ink-700)]">
                <X className="mt-0.5 size-3.5 shrink-0 text-[var(--color-sunset-500)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
