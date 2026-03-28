"use client";

import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-4 rounded-[var(--radius-md)] border border-white/50 px-4 py-3.5 transition-all duration-200 cursor-pointer select-none",
        checked
          ? "bg-[var(--color-sea-50)] shadow-[var(--shadow-clay-sm)] border-[var(--color-sea-100)]"
          : "bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-inset)]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-all duration-300",
          checked
            ? "bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-600)] shadow-[var(--shadow-clay-sea)]"
            : "bg-[var(--color-ink-300)] shadow-[var(--shadow-clay-inset)]",
        )}
      >
        <span
          className={cn(
            "inline-block size-5 rounded-full bg-white transition-all duration-300",
            "shadow-[2px_2px_4px_rgba(0,0,0,0.1),-1px_-1px_3px_rgba(255,255,255,0.8)]",
            checked ? "translate-x-6" : "translate-x-1",
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && (
            <p className="text-sm font-medium text-[var(--color-ink-900)]">{label}</p>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-[var(--color-ink-500)]">{description}</p>
          )}
        </div>
      )}
    </label>
  );
}
