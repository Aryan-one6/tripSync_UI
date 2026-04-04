import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, options, placeholder, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-12 w-full appearance-none rounded-[var(--radius-md)] border border-white/50 bg-[var(--color-surface-2)] pl-4 pr-10 text-base text-[var(--color-ink-900)] md:text-sm",
          "shadow-[var(--shadow-clay-inset)]",
          "outline-none transition-all duration-200",
          "focus:border-[var(--color-sea-300)] focus:shadow-[var(--shadow-clay-inset),0_0_0_3px_rgba(20,184,138,0.15)]",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-ink-500)]" />
    </div>
  );
});
