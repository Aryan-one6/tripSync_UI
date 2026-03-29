import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 sm:p-6",
        "shadow-[var(--shadow-sm)]",
        "overflow-hidden",
        "transition-shadow duration-200 hover:shadow-[var(--shadow-md)]",
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

/** Featured card — high-emphasis surface with stronger shadow */
export function CardFeatured({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-4 sm:p-6",
        "shadow-[var(--shadow-md)]",
        "overflow-hidden",
        "transition-shadow duration-200 hover:shadow-[var(--shadow-lg)]",
        className,
      )}
      {...props}
    />
  );
}
