"use client";

import { type ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { cn } from "@/lib/utils";

export function DashboardShell({
  title,
  subtitle,
  variant,
  children,
  actions,
}: {
  title: string;
  subtitle: string;
  variant: "user" | "agency";
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full container px-4 py-4 md:px-6 md:py-8">
      <div className="grid gap-6 md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr]">

        {/* Desktop sidebar only — mobile nav is in the header sidebar */}
        <div className="hidden md:block">
          <div className="sticky top-20">
            <AppSidebar variant={variant} />
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-5 sm:space-y-6 pb-mobile-nav md:pb-0">
          {/* Dashboard page header */}
          <header className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-sm)] sm:p-6">
            {/* Accent stripe */}
            <div
              className={cn(
                "absolute inset-x-0 top-0 h-1 rounded-t-xl",
                variant === "agency"
                  ? "bg-gradient-to-r from-[var(--color-lavender-400)] via-[var(--color-lavender-500)] to-[var(--color-sea-500)]"
                  : "bg-gradient-to-r from-[var(--color-sea-400)] via-[var(--color-sea-500)] to-[var(--color-sea-600)]"
              )}
            />
            <div className="relative">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] shadow-[var(--shadow-sm)]",
                  variant === "agency"
                    ? "bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)]"
                    : "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                )}
              >
                {variant === "agency" ? "Agency Dashboard" : "Traveler Dashboard"}
              </span>
              <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl text-[var(--color-ink-950)] sm:text-3xl capitalize">
                    {title}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm text-[var(--color-ink-600)] leading-relaxed">
                    {subtitle}
                  </p>
                </div>
                {actions && <div className="shrink-0">{actions}</div>}
              </div>
            </div>
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}
