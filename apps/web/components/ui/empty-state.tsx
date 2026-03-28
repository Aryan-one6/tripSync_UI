import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="relative flex flex-col items-center gap-5 overflow-hidden p-8 text-center sm:p-12">
      {/* Decorative blobs */}
      <div className="clay-blob -top-12 -right-12 size-40 bg-[var(--color-sea-200)] opacity-15" />
      <div className="clay-blob -bottom-10 -left-10 size-32 bg-[var(--color-sunset-200)] opacity-10" />

      {Icon ? (
        <div className="relative flex size-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-surface-2)] shadow-[var(--shadow-clay)] text-[var(--color-ink-400)]">
          <Icon className="size-7" />
        </div>
      ) : null}
      <div className="relative">
        <h3 className="font-display text-xl sm:text-2xl text-[var(--color-ink-950)]">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-[var(--color-ink-600)] leading-relaxed">{description}</p>
      </div>
      {action ? <div className="relative">{action}</div> : null}
    </Card>
  );
}
