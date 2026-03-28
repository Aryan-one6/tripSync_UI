"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const itemNumber = `${index + 1}`.padStart(2, "0");
        return (
          <button
            key={item.question}
            type="button"
            onClick={() => setOpenIndex(isOpen ? null : index)}
            className={cn(
              "w-full text-left rounded-[var(--radius-md)] border transition-all duration-300",
              isOpen
                ? "border-[var(--color-sea-100)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-clay-sm)]"
                : "border-white/40 bg-[var(--color-surface-2)] shadow-[var(--shadow-clay-inset)] hover:shadow-[var(--shadow-clay-sm)]",
            )}
          >
            <div className="flex items-start gap-2.5 px-3 py-3 sm:px-4 sm:py-3.5">
              <div
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold transition-colors sm:size-7 sm:text-[10px]",
                  isOpen
                    ? "bg-[var(--color-sea-100)] text-[var(--color-sea-700)]"
                    : "bg-white/70 text-[var(--color-ink-500)] shadow-[var(--shadow-clay-sm)]",
                )}
              >
                {itemNumber}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-[13px] font-semibold leading-5 transition-colors sm:text-sm sm:leading-6",
                    isOpen ? "text-[var(--color-ink-950)]" : "text-[var(--color-ink-700)]",
                  )}
                >
                  {item.question}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "mt-0.5 size-3.5 shrink-0 text-[var(--color-ink-400)] transition-transform duration-300 sm:mt-1 sm:size-4",
                  isOpen && "rotate-180 text-[var(--color-sea-600)]",
                )}
              />
            </div>
            <div
              className={cn(
                "overflow-hidden transition-all duration-300",
                isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
              )}
            >
              <div className="border-t border-[var(--color-line)] px-3 pb-3 pt-2 sm:px-4 sm:pb-3.5 sm:pt-2.5">
                <p className="text-[12px] leading-5 text-[var(--color-ink-600)] sm:pl-9 sm:text-[13px] sm:leading-6">
                  {item.answer}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
