import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary: [
          "bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-white",
          "shadow-[var(--shadow-clay-sea)]",
          "hover:from-[var(--color-sea-400)] hover:to-[var(--color-sea-600)] hover:shadow-[8px_8px_18px_rgba(10,122,92,0.4),-6px_-6px_14px_rgba(200,245,229,0.6),inset_2px_2px_4px_rgba(255,255,255,0.35),inset_-1px_-1px_3px_rgba(0,0,0,0.12)]",
          "hover:-translate-y-0.5",
          "active:shadow-[inset_4px_4px_8px_rgba(8,96,73,0.4),inset_-2px_-2px_6px_rgba(200,245,229,0.3)]",
          "rounded-full",
        ].join(" "),
        secondary: [
          "bg-[var(--color-surface-raised)] text-[var(--color-ink-900)]",
          "border border-white/60",
          "shadow-[var(--shadow-clay-btn)]",
          "hover:shadow-[var(--shadow-clay-btn-hover)] hover:-translate-y-0.5",
          "active:shadow-[var(--shadow-clay-btn-active)]",
          "rounded-full",
        ].join(" "),
        ghost: [
          "text-[var(--color-ink-700)] rounded-[var(--radius-md)]",
          "hover:bg-white/50 hover:shadow-[var(--shadow-clay-sm)]",
          "active:shadow-[var(--shadow-clay-btn-active)]",
        ].join(" "),
        danger: [
          "bg-gradient-to-b from-[var(--color-sunset-500)] to-[var(--color-sunset-700)] text-white",
          "shadow-[var(--shadow-clay-sunset)]",
          "hover:from-[var(--color-sunset-400)] hover:to-[var(--color-sunset-600)] hover:-translate-y-0.5",
          "active:shadow-[inset_4px_4px_8px_rgba(184,58,18,0.4),inset_-2px_-2px_6px_rgba(255,225,208,0.3)]",
          "rounded-full",
        ].join(" "),
        soft: [
          "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]",
          "border border-[var(--color-sea-100)]",
          "shadow-[var(--shadow-clay-sm)]",
          "hover:bg-[var(--color-sea-100)] hover:shadow-[var(--shadow-clay)]",
          "rounded-full",
        ].join(" "),
      },
      size: {
        default: "px-6 py-3 text-sm",
        sm: "px-4 py-2 text-xs",
        lg: "px-8 py-4 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
