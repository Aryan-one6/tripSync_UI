import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide shadow-[var(--shadow-clay-sm)] border border-white/50 transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-sand-100)] text-[var(--color-ink-700)]",
        sea:
          "bg-[var(--color-sea-50)] text-[var(--color-sea-700)] border-[var(--color-sea-100)]",
        sunset:
          "bg-[var(--color-sunset-50)] text-[var(--color-sunset-700)] border-[var(--color-sunset-100)]",
        lavender:
          "bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)] border-[var(--color-lavender-100)]",
        rose:
          "bg-[var(--color-rose-50)] text-[var(--color-rose-400)] border-[var(--color-rose-100)]",
        outline:
          "bg-transparent text-[var(--color-ink-600)] border-[var(--color-line-strong)] shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
