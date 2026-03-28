"use client";

import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardShell({
  title,
  subtitle,
  variant,
  children,
}: {
  title: string;
  subtitle: string;
  variant: "user" | "agency";
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-6 md:py-8">
      <div className="grid gap-6 md:grid-cols-[260px_1fr] lg:grid-cols-[280px_1fr]">
        {/* Mobile sidebar toggle */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-white/60 bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-clay-sm)] transition-all active:shadow-[var(--shadow-clay-btn-active)] md:hidden"
        >
          <Menu className="size-5 text-[var(--color-ink-600)]" />
          <span className="text-sm font-medium text-[var(--color-ink-700)]">
            {variant === "agency" ? "Agency Menu" : "Navigation"}
          </span>
        </button>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-[var(--color-ink-950)]/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="absolute bottom-0 left-0 right-0 max-h-[80dvh] animate-slide-up overflow-y-auto rounded-t-[var(--radius-xl)] border-t border-white/60 bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-clay-lg)] safe-bottom">
              <div className="mb-4 flex items-center justify-between">
                <p className="font-display text-lg text-[var(--color-ink-950)]">Navigation</p>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="flex size-9 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-ink-600)] shadow-[var(--shadow-clay-sm)]"
                >
                  <X className="size-4" />
                </button>
              </div>
              <AppSidebar variant={variant} onNavigate={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <div className="sticky top-24">
            <AppSidebar variant={variant} />
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-5 sm:space-y-6">
          {/* Dashboard header */}
          <header className="relative overflow-hidden rounded-[var(--radius-xl)] border border-white/60 bg-[var(--color-surface-raised)] p-5 shadow-[var(--shadow-clay)] sm:p-7">
            {/* Decorative blobs */}
            <div className="clay-blob -top-10 right-0 size-40 bg-[var(--color-sea-200)] opacity-15 animate-blob" />
            <div className="clay-blob -bottom-8 -left-8 size-28 bg-[var(--color-lavender-200)] opacity-10 animate-blob delay-300" />

            <div className="relative">
              <span className="inline-flex items-center rounded-full bg-[var(--color-sea-50)] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)]">
                {variant === "agency" ? "Agency Dashboard" : "Traveler Dashboard"}
              </span>
              <h1 className="mt-3 font-display text-2xl text-[var(--color-ink-950)] sm:text-3xl md:text-4xl">
                {title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-600)] leading-relaxed">
                {subtitle}
              </p>
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  );
}
