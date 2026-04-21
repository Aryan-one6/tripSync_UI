import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | TravellersIn",
  description: "Privacy Policy for TravellersIn.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-ink-500)]">
          Legal
        </p>
        <h1 className="mt-2 font-display text-3xl text-[var(--color-ink-950)]">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-[var(--color-ink-600)]">
          Last updated: April 20, 2026
        </p>

        <section className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--color-ink-700)]">
          <p>
            TravellersIn collects only the data required to provide account access, trip coordination, payments,
            safety features, and customer support.
          </p>
          <p>
            We store profile details, booking/payment metadata, and platform activity logs to operate and secure the
            service. Sensitive data is protected through access controls and encryption practices.
          </p>
          <p>
            We do not sell personal data. Information is shared only with necessary service providers and partners for
            platform operations, compliance, and support.
          </p>
          <p>
            You can request data access, correction, or deletion through official support channels, subject to legal
            and operational retention requirements.
          </p>
        </section>
      </article>
    </main>
  );
}
