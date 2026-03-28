import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 sm:p-6",
        "shadow-[var(--shadow-md)]",
        "overflow-hidden",
        "transition-shadow duration-200",
        className,
      )}
      {...props}
    />
  );
}

/** Secondary surface — slightly recessed, for nested content */
export function CardInset({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 sm:p-4",
        className,
      )}
      {...props}
    />
  );
}

/** Featured card — keeps clay shadow for high-emphasis surfaces */
export function CardFeatured({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-white/70 bg-[var(--color-surface-raised)] p-4 sm:p-6",
        "shadow-[var(--shadow-clay)]",
        "overflow-hidden",
        "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
        "hover:shadow-[var(--shadow-clay-lg)] hover:-translate-y-1",
        className,
      )}
      {...props}
    />
  );
}
