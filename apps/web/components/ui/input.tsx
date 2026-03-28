import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-[var(--radius-md)] border border-white/50 bg-[var(--color-surface-2)] px-4 text-sm text-[var(--color-ink-900)]",
        "shadow-[var(--shadow-clay-inset)]",
        "outline-none transition-all duration-200",
        "placeholder:text-[var(--color-ink-400)]",
        "focus:border-[var(--color-sea-300)] focus:shadow-[var(--shadow-clay-inset),0_0_0_3px_rgba(20,184,138,0.15)]",
        className,
      )}
      {...props}
    />
  );
});
