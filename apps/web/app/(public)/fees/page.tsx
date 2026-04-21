import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fees & Taxes | TravellersIn",
  description: "Platform fee and tax information for TravellersIn payments.",
};

export default function FeesPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
          Payments
        </p>
        <h1 className="mt-2 font-display text-3xl text-[var(--color-ink-950)]">
          Fees & Taxes
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-600)]">
          Last updated: April 20, 2026
        </p>

        <section className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--color-ink-700)]">
          <p>
            Trip pricing is shown transparently at checkout. Final payable amount can include:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Trip/package amount</li>
            <li>Platform fee</li>
            <li>Applicable GST/tax on platform fee</li>
            <li>Any wallet or loyalty adjustments (if used)</li>
          </ul>
          <p>
            Exact fee and tax values are displayed before payment confirmation and reflected in invoice/payment
            records.
          </p>
          <p>
            Escrow and payout timelines follow the booking terms and milestone completion rules shown in checkout.
          </p>
        </section>
      </article>
    </main>
  );
}
