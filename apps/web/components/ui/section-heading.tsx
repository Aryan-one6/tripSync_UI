import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-2xl tracking-tight text-[var(--color-ink-950)] sm:text-3xl md:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-sm sm:text-base text-[var(--color-ink-600)] leading-relaxed">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
