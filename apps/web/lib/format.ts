import { format } from "date-fns";

export function formatCurrency(value?: number | null) {
  if (value === null || value === undefined) {
    return "Flexible";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateRange(start?: string | Date | null, end?: string | Date | null) {
  if (!start && !end) return "Dates flexible";
  if (start && !end) return format(new Date(start), "dd MMM yyyy");
  if (!start && end) return format(new Date(end), "dd MMM yyyy");
  return `${format(new Date(start as string | Date), "dd MMM")} - ${format(
    new Date(end as string | Date),
    "dd MMM yyyy",
  )}`;
}

export function formatCompactDate(value?: string | Date | null) {
  if (!value) return "TBA";
  return format(new Date(value), "dd MMM yyyy");
}

export function formatVibes(vibes?: string[] | null) {
  return (vibes ?? []).filter(Boolean).slice(0, 4);
}

export function formatDuration(start?: string | Date | null, end?: string | Date | null) {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return null;
  const nights = days - 1;
  return { days, nights, label: `${nights}N/${days}D` };
}

export function formatDurationLabel(start?: string | Date | null, end?: string | Date | null) {
  const dur = formatDuration(start, end);
  return dur?.label ?? "Dates TBD";
}

export function initials(name?: string | null) {
  return (name ?? "TS")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
