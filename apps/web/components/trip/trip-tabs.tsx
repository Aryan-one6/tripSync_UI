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
      {/* Professional tab bar with underline indicator */}
      <div className="space-y-4">
        <div className="border-b border-[var(--color-ink-200)]">
          <div className="flex gap-1 overflow-x-auto sm:hide-scrollbar">
            {tabs.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors duration-200",
                    isActive
                      ? "text-[var(--color-sea-700)]"
                      : "text-[var(--color-ink-600)] hover:text-[var(--color-ink-800)]"
                  )}
                >
                  {tab.icon && <span className="size-4">{tab.icon}</span>}
                  <span>{tab.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-sea-500)] to-[var(--color-sea-600)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content with fade animation */}
        <div className="animate-fade-in" key={activeTab}>
          {active?.content}
        </div>
      </div>
    </div>
  );
}
