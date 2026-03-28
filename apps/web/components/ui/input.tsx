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
        "h-11 w-full rounded-md border border-(--color-border-strong) bg-(--color-surface-raised) px-4 text-sm text-foreground",
        "outline-none transition-all duration-150",
        "placeholder:text-(--color-ink-400)",
        "focus:border-(--color-sea-400) focus:shadow-[0_0_0_3px_rgba(20,184,138,0.12)]",
        className,
      )}
      {...props}
    />
  );
});
