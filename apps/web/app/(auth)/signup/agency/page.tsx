import { AgencySignupForm } from "@/components/auth/agency-signup-form";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, TrendingUp, Handshake, Award, Building2 } from "lucide-react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const BENEFITS = [
  { icon: Handshake, text: "Access travelers with confirmed dates & budgets" },
  { icon: TrendingUp, text: "Real-time analytics on bids, packages & revenue" },
  { icon: Award, text: "Pro Mode: 30% payout before trip, 60% after" },
  { icon: CheckCircle2, text: "Only 8% platform commission vs 15–25% on OTAs" },
  { icon: Building2, text: "Dedicated agency dashboard & group management" },
];

const STATS = [
  { value: "340+", label: "Agencies" },
  { value: "₹4.8Cr", label: "Escrow processed" },
  { value: "8%", label: "Commission" },
];

export default async function AgencySignupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/agency/dashboard";

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1fr_560px]">
      {/* ── Left: visual side ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden">
        {/* Dark gradient bg — no hero image dependency */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-violet-950 to-gray-900" />
        {/* Blobs */}
        <div className="pointer-events-none absolute -right-20 top-24 size-72 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-0 size-60 rounded-full bg-emerald-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-10">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-black text-white">TravellersIn</span>
            <span className="rounded-full bg-violet-500/30 border border-violet-400/30 px-2 py-0.5 text-[9px] font-bold text-violet-300 uppercase tracking-wider">Agency</span>
          </Link>

          {/* Middle */}
          <div className="space-y-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-bold text-white/70 uppercase tracking-wider">
              <Building2 className="size-3 text-violet-400" />
              Agency partner registration
            </div>

            <h2 className="font-display text-4xl font-black text-white leading-tight">
              Grow your agency
              <br />
              <span className="text-violet-300">without cold calls.</span>
            </h2>
            <p className="text-sm text-white/55 max-w-sm leading-relaxed">
              Browse live group trip requests, submit bids instantly, negotiate fair prices, and get paid through India&apos;s safest escrow system.
            </p>

            {/* Benefits list */}
            <div className="space-y-2.5 pt-1">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/8 border border-white/10">
                    <Icon className="size-3.5 text-violet-300" />
                  </div>
                  <p className="text-sm text-white/65">{text}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                  <p className="font-display text-xl font-black text-white">{s.value}</p>
                  <p className="text-[9px] text-white/40 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              Free to register · Commission only on successful bookings
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="flex flex-col overflow-y-auto bg-white">
        {/* Mobile brand */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 lg:hidden">
          <Link href="/" className="font-display text-lg font-black text-gray-950">TravellersIn</Link>
          <Link href="/login" className="text-sm font-semibold text-violet-600">Sign In</Link>
        </div>

        <div className="flex flex-1 items-start justify-center p-4 sm:p-7 sm:pt-7">
          <div className="w-full max-w-lg">
            <AgencySignupForm nextPath={nextPath} />
          </div>
        </div>

        <div className="px-6 pb-5 text-center text-[10px] text-gray-400">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-violet-600 hover:underline">Terms</Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-violet-600 hover:underline">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
}
