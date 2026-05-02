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
      {/* Thrillophilia-style tab bar */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all duration-200",
                  "border-b-2",
                  isActive
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                )}
              >
                {tab.icon && (
                  <span className={cn("size-4 shrink-0", isActive ? "text-emerald-600" : "text-slate-400")}>
                    {tab.icon}
                  </span>
                )}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      <div key={activeTab} className="animate-in fade-in duration-200">
        {active?.content}
      </div>
    </div>
  );
}
