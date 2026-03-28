"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperStep {
  key: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  onStepClick?: (index: number) => void;
}

export function Stepper({ steps, currentStep, onStepClick }: StepperProps) {
  return (
    <>
      {/* Mobile stepper — compact horizontal */}
      <div className="flex items-center gap-2 sm:hidden">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onStepClick?.(index)}
              disabled={!onStepClick || index > currentStep}
              className="flex flex-1 flex-col items-center gap-2"
            >
              <div className="flex w-full items-center">
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                    isCompleted &&
                      "bg-gradient-to-b from-[var(--color-sea-400)] to-[var(--color-sea-600)] text-white shadow-[var(--shadow-clay-sea)]",
                    isActive &&
                      "bg-gradient-to-b from-[var(--color-sea-400)] to-[var(--color-sea-600)] text-white shadow-[var(--shadow-clay-sea)] scale-110",
                    !isCompleted &&
                      !isActive &&
                      "bg-(--color-surface-2) text-(--color-ink-400) border border-(--color-border)",
                  )}
                >
                  {isCompleted ? <Check className="size-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className="mx-1 h-0.5 flex-1 rounded-full bg-(--color-surface-3)">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-500)] transition-all duration-500"
                      style={{ width: isCompleted ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-tight",
                  isActive ? "text-[var(--color-sea-700)]" : "text-[var(--color-ink-400)]",
                )}
              >
                {step.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* Desktop stepper — full with descriptions */}
      <div className="hidden sm:flex items-start gap-0">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <div key={step.key} className="flex flex-1 items-start">
              <button
                type="button"
                onClick={() => onStepClick?.(index)}
                disabled={!onStepClick || index > currentStep}
                className="flex flex-1 flex-col items-center gap-3 group"
              >
                {/* Step indicator row */}
                <div className="flex w-full items-center">
                  {index > 0 && (
                    <div className="h-0.5 flex-1 rounded-full bg-(--color-surface-3)">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-500)] transition-all duration-500"
                        style={{ width: isCompleted || isActive ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                  <div
                    className={cn(
                      "relative flex size-12 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                      isCompleted &&
                        "bg-gradient-to-b from-[var(--color-sea-400)] to-[var(--color-sea-600)] text-white shadow-[var(--shadow-clay-sea)]",
                      isActive &&
                        "bg-gradient-to-b from-[var(--color-sea-400)] to-[var(--color-sea-600)] text-white shadow-[var(--shadow-clay-sea)] ring-4 ring-[var(--color-sea-100)]",
                      !isCompleted &&
                        !isActive &&
                        "bg-(--color-surface-2) text-(--color-ink-400) border border-(--color-border)",
                    )}
                  >
                    {isCompleted ? <Check className="size-5" /> : step.icon ?? index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="h-0.5 flex-1 rounded-full bg-(--color-surface-3)">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--color-sea-400)] to-[var(--color-sea-500)] transition-all duration-500"
                        style={{ width: isCompleted ? "100%" : "0%" }}
                      />
                    </div>
                  )}
                </div>

                {/* Labels */}
                <div className="text-center px-1">
                  <p
                    className={cn(
                      "text-sm font-semibold transition-colors",
                      isActive
                        ? "text-[var(--color-ink-950)]"
                        : isCompleted
                          ? "text-[var(--color-sea-700)]"
                          : "text-[var(--color-ink-400)]",
                    )}
                  >
                    {step.title}
                  </p>
                  {step.description && (
                    <p className="mt-0.5 text-xs text-[var(--color-ink-500)] hidden lg:block">
                      {step.description}
                    </p>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
