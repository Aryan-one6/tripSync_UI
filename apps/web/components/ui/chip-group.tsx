"use client";

import { cn } from "@/lib/utils";

interface ChipGroupProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  variant?: "sea" | "sunset" | "lavender";
  label?: string;
}

const variantStyles = {
  sea: {
    active:
      "bg-gradient-to-b from-[var(--color-sea-100)] to-[var(--color-sea-50)] text-[var(--color-sea-700)] border-[var(--color-sea-200)] shadow-[var(--shadow-clay-sm)]",
    inactive:
      "bg-[var(--color-surface-raised)] text-[var(--color-ink-600)] border-white/60 shadow-[var(--shadow-clay-sm)]",
  },
  sunset: {
    active:
      "bg-gradient-to-b from-[var(--color-sunset-100)] to-[var(--color-sunset-50)] text-[var(--color-sunset-700)] border-[var(--color-sunset-200)] shadow-[var(--shadow-clay-sm)]",
    inactive:
      "bg-[var(--color-surface-raised)] text-[var(--color-ink-600)] border-white/60 shadow-[var(--shadow-clay-sm)]",
  },
  lavender: {
    active:
      "bg-gradient-to-b from-[var(--color-lavender-100)] to-[var(--color-lavender-50)] text-[var(--color-lavender-500)] border-[var(--color-lavender-200)] shadow-[var(--shadow-clay-sm)]",
    inactive:
      "bg-[var(--color-surface-raised)] text-[var(--color-ink-600)] border-white/60 shadow-[var(--shadow-clay-sm)]",
  },
};

export function ChipGroup({ options, selected, onToggle, variant = "sea", label }: ChipGroupProps) {
  const styles = variantStyles[variant];

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm font-medium text-[var(--color-ink-700)]">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => onToggle(option)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
                "active:scale-95",
                isSelected ? styles.active : styles.inactive,
                !isSelected && "hover:shadow-[var(--shadow-clay)] hover:-translate-y-0.5",
              )}
            >
              {isSelected && <span className="mr-1">✓</span>}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
