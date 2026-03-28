import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-5">
      {/* Subtle blob */}
      <div className="clay-blob -top-6 -right-6 size-20 bg-[var(--color-sea-200)] opacity-15" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
            {label}
          </p>
          <p className="mt-2 font-display text-3xl text-[var(--color-ink-950)] sm:text-4xl">{value}</p>
          <p className="mt-1.5 text-xs text-[var(--color-ink-600)] sm:text-sm">{note}</p>
        </div>
        <div className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
          {icon}
        </div>
      </div>
    </Card>
  );
}
