import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-wide border transition-colors duration-150",
  {
    variants: {
      variant: {
        default:
          "bg-(--color-surface-2) text-(--color-ink-700) border-(--color-border)",
        sea:
          "bg-(--color-sea-50) text-(--color-sea-700) border-(--color-sea-100)",
        sunset:
          "bg-(--color-sunset-50) text-(--color-sunset-700) border-(--color-sunset-100)",
        lavender:
          "bg-(--color-lavender-50) text-(--color-lavender-500) border-(--color-lavender-100)",
        rose:
          "bg-(--color-rose-50) text-(--color-rose-400) border-(--color-rose-100)",
        outline:
          "bg-transparent text-(--color-ink-600) border-(--color-border-strong)",
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
