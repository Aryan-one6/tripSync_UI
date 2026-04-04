import { AgencySignupForm } from "@/components/auth/agency-signup-form";
import { Building2, CheckCircle2, TrendingUp, Award, Handshake } from "lucide-react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BENEFITS = [
  { icon: Handshake, title: "Qualified trip leads", desc: "Access travelers with confirmed dates, budgets, and group sizes." },
  { icon: TrendingUp, title: "Agency analytics", desc: "Track bid win rates, package performance, and revenue in real time." },
  { icon: Award, title: "Earn Pro Mode status", desc: "High-performing agencies get 30% upfront — no more cash-flow problems." },
];

const STATS = [
  { value: "340+", label: "Agencies on platform" },
  { value: "₹4.8Cr", label: "Escrow processed" },
  { value: "8%", label: "Commission vs 15–25% OTA" },
];

export default async function AgencySignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/agency/dashboard";

  return (
    <div className="min-h-[90vh] grid lg:grid-cols-[1fr_1fr]">

      {/* ── Left: visual side ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-gradient-to-br from-[var(--color-ink-950)] via-[#1a1a3e] to-[var(--color-lavender-900,#2d1a6e)]">
        {/* Blobs */}
        <div className="pointer-events-none absolute -right-20 top-20 size-80 rounded-full bg-[var(--color-lavender-500)]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 size-60 rounded-full bg-[var(--color-sea-500)]/10 blur-2xl" />

        <div className="relative flex flex-1 flex-col justify-between p-12">
          {/* Top */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold text-white/70 backdrop-blur-sm">
              <Building2 className="size-3.5 text-[var(--color-lavender-400)]" />
              Agency partner registration
            </span>
          </div>

          {/* Middle */}
          <div className="space-y-8">
            <div>
              <h1 className="font-display text-5xl font-black leading-[1.02] text-white xl:text-6xl">
                Grow your agency
                <br />
                <em className="not-italic text-[var(--color-lavender-300,#b09dff)]">without cold calls.</em>
              </h1>
              <p className="mt-5 max-w-sm text-white/55 leading-relaxed">
                Browse live group trip requests. Submit bids instantly. Negotiate fair prices.
                Get paid through India&apos;s safest escrow system.
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-4">
              {BENEFITS.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="size-4 text-[var(--color-lavender-300,#b09dff)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-white/45 leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
                >
                  <p className="font-display text-2xl font-black text-white">{stat.value}</p>
                  <p className="text-[10px] text-white/45 mt-1 leading-tight">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center gap-2 text-sm text-white/55">
              <CheckCircle2 className="size-4 text-[var(--color-sea-400)]" />
              Free to register · Commission only on successful bookings
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="flex items-start justify-center p-6 sm:p-10 lg:p-12 bg-[var(--color-surface)] overflow-y-auto">
        <div className="w-full max-w-md pt-4">
          <AgencySignupForm nextPath={nextPath} />
        </div>
      </div>
    </div>
  );
}
