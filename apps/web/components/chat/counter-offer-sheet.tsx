"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CounterOfferPayload {
  price: number;
  requestedAdditions: string[];
  message: string;
}

interface CounterOfferSheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CounterOfferPayload) => Promise<void>;
  currentPrice: number;
  initialPrice?: number;
  counterRound?: number;
  maxRounds?: number;
}

// ─── Available additions ──────────────────────────────────────────────────────

const ADDITIONS = [
  { key: "transport",  label: "Transport" },
  { key: "hotel",      label: "Hotels" },
  { key: "meals",      label: "Meals" },
  { key: "guide",      label: "Guide" },
  { key: "visa",       label: "Visa" },
  { key: "insurance",  label: "Insurance" },
  { key: "activities", label: "Activities" },
];

const PRICE_STEP = 500;

// ─── Component ────────────────────────────────────────────────────────────────

export function CounterOfferSheet({
  open,
  onClose,
  onSubmit,
  currentPrice,
  initialPrice,
  counterRound = 1,
  maxRounds = 3,
}: CounterOfferSheetProps) {
  const [counterPrice, setCounterPrice] = useState(currentPrice);
  const [selectedAdditions, setSelectedAdditions] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Reset state when sheet opens with a new current price
  useEffect(() => {
    if (open) {
      setCounterPrice(initialPrice ?? currentPrice);
      setSelectedAdditions([]);
      setMessage("");
    }
  }, [open, currentPrice, initialPrice]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handler);
    }
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const toggleAddition = (key: string) => {
    setSelectedAdditions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleSubmit = () => {
    startTransition(() => {
      void onSubmit({
        price: counterPrice,
        requestedAdditions: selectedAdditions,
        message,
      }).then(() => {
        onClose();
      });
    });
  };

  const savings = currentPrice - counterPrice;

  return (
    <>
      {/* Backdrop */}
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-[var(--radius-2xl)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-xl)] transition-transform duration-350 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "90dvh", overflowY: "auto" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="h-1 w-10 rounded-full bg-[var(--color-border-strong)]" />
        </div>

        <div className="px-5 pb-8 sm:px-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--color-ink-950)]">
                Your Counter Offer
              </h2>
              <p className="mt-0.5 text-sm text-[var(--color-ink-500)]">
                Counter round {counterRound} of {maxRounds}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-full hover:bg-[var(--color-surface-2)] transition-colors"
            >
              <X className="size-5 text-[var(--color-ink-500)]" />
            </button>
          </div>

          {/* Price stepper */}
          <div className="rounded-[var(--radius-xl)] bg-[var(--color-surface-2)] p-6 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-ink-500)] mb-4">
              Your counter price / person
            </p>
            <div className="flex items-center justify-center gap-4">
              {/* Minus */}
              <button
                type="button"
                onClick={() => setCounterPrice((p) => Math.max(0, p - PRICE_STEP))}
                className="flex size-12 items-center justify-center rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-sea-50)] hover:border-[var(--color-sea-200)] transition-all"
              >
                <Minus className="size-5 text-[var(--color-ink-700)]" />
              </button>

              {/* Price display */}
              <div className="min-w-[160px]">
                <p className="font-display text-4xl font-bold text-[var(--color-ink-950)]">
                  {formatCurrency(counterPrice)}
                </p>
                {savings > 0 && (
                  <p className="mt-1 text-sm text-[var(--color-sea-600)] font-semibold">
                    Save {formatCurrency(savings)} from offer
                  </p>
                )}
                {savings < 0 && (
                  <p className="mt-1 text-sm text-[var(--color-sunset-600)]">
                    +{formatCurrency(Math.abs(savings))} above offer
                  </p>
                )}
              </div>

              {/* Plus */}
              <button
                type="button"
                onClick={() => setCounterPrice((p) => p + PRICE_STEP)}
                className="flex size-12 items-center justify-center rounded-full bg-[var(--color-surface-raised)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-sea-50)] hover:border-[var(--color-sea-200)] transition-all"
              >
                <Plus className="size-5 text-[var(--color-ink-700)]" />
              </button>
            </div>

            {/* Fine-grained input */}
            <div className="mt-4">
              <input
                type="number"
                value={counterPrice}
                min={0}
                step={PRICE_STEP}
                onChange={(e) => setCounterPrice(Math.max(0, Number(e.target.value)))}
                className="w-32 rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface-raised)] px-3 py-2 text-center text-base font-semibold text-[var(--color-ink-900)] focus:border-[var(--color-sea-400)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sea-400)]/20 md:text-sm"
              />
              <p className="mt-1.5 text-[11px] text-[var(--color-ink-400)]">Or type a custom amount</p>
            </div>
          </div>

          {/* Request additions */}
          <div>
            <p className="mb-3 text-sm font-semibold text-[var(--color-ink-700)]">
              Request additions <span className="font-normal text-[var(--color-ink-400)]">(optional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {ADDITIONS.map(({ key, label }) => {
                const selected = selectedAdditions.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleAddition(key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                      selected
                        ? "border-[var(--color-sea-300)] bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-ink-600)] hover:border-[var(--color-sea-200)] hover:bg-[var(--color-sea-50)]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional message */}
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--color-ink-700)]">
              Message <span className="font-normal text-[var(--color-ink-400)]">(optional)</span>
            </p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi, we'd like to negotiate on the price because..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSubmit}
              disabled={isPending || counterPrice <= 0}
            >
              {isPending ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sending...
                </>
              ) : (
                `Send Counter at ${formatCurrency(counterPrice)}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
