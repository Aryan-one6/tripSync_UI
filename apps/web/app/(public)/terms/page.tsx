import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | TravellersIn",
  description: "Terms of Service for TravellersIn.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
          Legal
        </p>
        <h1 className="mt-2 font-display text-3xl text-[var(--color-ink-950)]">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-600)]">
          Last updated: April 20, 2026
        </p>

        <section className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--color-ink-700)]">
          <p>
            By accessing or using TravellersIn, you agree to use the platform only for lawful trip-planning,
            booking, and collaboration activities.
          </p>
          <p>
            Users are responsible for account security, truthful listing details, and compliance with applicable laws.
            Misuse, fraud, harassment, payment bypass, or policy violations may result in suspension.
          </p>
          <p>
            Payments, cancellations, refunds, escrow flow, and agency/traveler responsibilities are governed by the
            trip-specific terms shown during checkout and confirmations.
          </p>
          <p>
            For disputes, security issues, or legal notices, contact support through the official channels listed in
            the app.
          </p>
        </section>
      </article>
    </main>
  );
}
