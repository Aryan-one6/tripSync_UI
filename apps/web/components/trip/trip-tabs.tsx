"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TripTab {
  key: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TripTabsProps {
  tabs: TripTab[];
  defaultTab?: string;
}

export function TripTabs({ tabs, defaultTab }: TripTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.key ?? "");

  const active = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 pb-1 sm:hide-scrollbar sm:-mx-1 sm:flex-nowrap sm:gap-1.5 sm:overflow-x-auto sm:px-1">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex min-w-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200 sm:shrink-0 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm",
                isActive
                  ? "bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-white  my-1 py-2"
                  : "bg-[var(--color-surface-raised)] text-[var(--color-ink-600)] shadow-[var(--shadow-clay-sm)] my-1 py-2 hover:shadow-[var(--shadow-clay)] hover:-translate-y-0.5",
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4 animate-rise-in" key={activeTab}>
        {active?.content}
      </div>
    </div>
  );
}
