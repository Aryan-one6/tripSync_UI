"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  size = "default",
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "default" | "lg" | "full";
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--color-ink-950)]/40 backdrop-blur-sm animate-scale-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "relative w-full animate-slide-up sm:animate-scale-in",
          "rounded-t-[var(--radius-xl)] sm:rounded-[var(--radius-xl)]",
          "border border-white/60 bg-[var(--color-surface-raised)]",
          "shadow-[var(--shadow-clay-lg)]",
          "max-h-[90dvh] overflow-y-auto",
          "safe-bottom",
          size === "default" && "sm:max-w-xl",
          size === "lg" && "sm:max-w-3xl",
          size === "full" && "sm:max-w-5xl",
        )}
      >
        {/* Clay blob decoration */}
        <div className="clay-blob -top-10 -right-10 size-32 bg-[var(--color-sea-200)] opacity-20" />
        <div className="clay-blob -bottom-8 -left-8 size-24 bg-[var(--color-sunset-200)] opacity-15" />

        <div className="relative p-5 sm:p-7">
          {/* Header */}
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display text-xl sm:text-2xl text-[var(--color-ink-950)]">{title}</h3>
              {description ? (
                <p className="mt-2 text-sm text-[var(--color-ink-600)]">{description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-ink-600)] shadow-[var(--shadow-clay-sm)] transition-all hover:shadow-[var(--shadow-clay)] active:shadow-[var(--shadow-clay-btn-active)]"
            >
              <X className="size-4" />
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
