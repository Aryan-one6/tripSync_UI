import { ShieldAlert } from "lucide-react";

interface CancellationPolicyProps {
  policy?: string | null;
}

const DEFAULT_TIERS = [
  { window: "30+ days before departure", charge: "25% of trip cost" },
  { window: "15–30 days before departure", charge: "50% of trip cost" },
  { window: "7–15 days before departure", charge: "75% of trip cost" },
  { window: "Less than 7 days", charge: "100% — no refund" },
];

export function CancellationPolicy({ policy }: CancellationPolicyProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="size-4 text-[var(--color-sunset-600)]" />
        <p className="font-display text-base text-[var(--color-ink-950)]">
          Cancellation policy
        </p>
      </div>

      {policy ? (
        <div className="rounded-[var(--radius-md)] border border-white/40 bg-[var(--color-surface-2)] p-4 shadow-[var(--shadow-clay-inset)]">
          <p className="text-sm leading-relaxed text-[var(--color-ink-600)] whitespace-pre-line">
            {policy}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {DEFAULT_TIERS.map((tier) => (
            <div
              key={tier.window}
              className="flex items-center justify-between rounded-[var(--radius-sm)] border border-white/40 bg-[var(--color-surface-2)] px-4 py-2.5 shadow-[var(--shadow-clay-inset)]"
            >
              <p className="text-sm text-[var(--color-ink-600)]">{tier.window}</p>
              <p className="text-sm font-semibold text-[var(--color-ink-800)]">
                {tier.charge}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-[var(--color-ink-500)]">
        Cancellation requests must be submitted in writing. Force majeure events are handled per applicable law.
      </p>
    </div>
  );
}
