import { ShieldCheck } from "lucide-react";

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-slate-500" />
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-500">
          Cancellation Policy
        </p>
      </div>

      {/* Content */}
      {policy ? (
        <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">
          {policy}
        </p>
      ) : (
        <div className="space-y-1.5">
          {DEFAULT_TIERS.map((tier) => (
            <div
              key={tier.window}
              className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0"
            >
              <p className="text-sm text-slate-600">{tier.window}</p>
              <p className="text-sm font-semibold text-slate-800">{tier.charge}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Cancellation requests must be submitted in writing. Force majeure events are
          handled per applicable law.
        </p>
        <button
          type="button"
          className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-700 underline hover:text-slate-900 transition"
        >
          View Detailed Terms
        </button>
      </div>
    </div>
  );
}
