import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: [
          "bg-[var(--color-sea-600)] text-white",
          "shadow-[var(--shadow-sm)]",
          "hover:bg-[var(--color-sea-700)] hover:shadow-[var(--shadow-md)]",
          "rounded-full",
        ].join(" "),
        secondary: [
          "bg-white border border-[var(--color-border)] text-[var(--color-ink-900)]",
          "shadow-[var(--shadow-sm)]",
          "hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-strong)]",
          "rounded-full",
        ].join(" "),
        ghost: [
          "text-[var(--color-ink-700)]",
          "hover:bg-[var(--color-surface-2)]",
          "rounded-[var(--radius-md)]",
        ].join(" "),
        danger: [
          "bg-[var(--color-sunset-600)] text-white",
          "shadow-[var(--shadow-sm)]",
          "hover:bg-[var(--color-sunset-700)] hover:shadow-[var(--shadow-md)]",
          "rounded-full",
        ].join(" "),
        soft: [
          "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]",
          "border border-[var(--color-sea-100)]",
          "shadow-[var(--shadow-sm)]",
          "hover:bg-[var(--color-sea-100)] hover:shadow-[var(--shadow-md)]",
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
