import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "min-h-28 w-full rounded-[var(--radius-lg)] border border-white/50 bg-[var(--color-surface-2)] px-5 py-4 text-base text-[var(--color-ink-900)] md:text-sm",
          "shadow-[var(--shadow-clay-inset)]",
          "outline-none transition-all duration-200 resize-none",
          "placeholder:text-[var(--color-ink-400)]",
          "focus:border-[var(--color-sea-300)] focus:shadow-[var(--shadow-clay-inset),0_0_0_3px_rgba(20,184,138,0.15)]",
          className,
        )}
        {...props}
      />
    );
  },
);
