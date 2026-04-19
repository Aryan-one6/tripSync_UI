import Link from "next/link";
import { ArrowRight, Users, Building2, CheckCircle2 } from "lucide-react";

const TRAVELER_PERKS = [
  "Browse 500+ verified group trips",
  "Negotiate directly with agencies",
  "Escrow-protected payments",
  "Earn 250 points for every referral",
  "Real-time group chat & coordination",
];

const AGENCY_PERKS = [
  "Access live group trip requests",
  "Submit bids & close deals faster",
  "Only 8% commission (vs 15–25% OTAs)",
  "30% payout before trip starts (Pro Mode)",
  "GST-grade payouts via secure escrow",
];

export default async function SignupPage() {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col items-center justify-center px-4 py-12">
      {/* Brand */}
      <Link href="/" className="mb-8 font-display text-2xl font-black text-gray-950">
        Travellers<span className="text-emerald-600">In</span>
      </Link>

      {/* Heading */}
      <div className="mb-8 text-center">
        <h1 className="font-display text-2xl font-black text-gray-950 sm:text-3xl">
          Join TravellersIn
        </h1>
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
          Choose how you want to use the platform. You can always switch later.
        </p>
      </div>

      {/* Cards */}
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        {/* Traveler card */}
        <Link href="/signup/traveler"
          className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-emerald-400 hover:shadow-lg hover:-translate-y-0.5"
        >
          {/* Icon */}
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 transition-all group-hover:bg-emerald-100">
            <Users className="size-6 text-emerald-600" />
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-black text-gray-950">I&apos;m a Traveler</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 uppercase">Popular</span>
            </div>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              Find group trips, connect with co-travelers, and get the best deals from verified agencies.
            </p>
          </div>

          <div className="space-y-1.5 mb-6 flex-1">
            {TRAVELER_PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
                <p className="text-[11px] text-gray-600">{perk}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Free · No credit card</span>
            <div className="flex items-center gap-1 rounded-xl bg-emerald-600 group-hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-colors">
              Get started <ArrowRight className="size-3.5" />
            </div>
          </div>
        </Link>

        {/* Agency card */}
        <Link href="/signup/agency"
          className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-violet-400 hover:shadow-lg hover:-translate-y-0.5"
        >
          {/* Icon */}
          <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-violet-50 border border-violet-100 transition-all group-hover:bg-violet-100">
            <Building2 className="size-6 text-violet-600" />
          </div>

          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-black text-gray-950">I&apos;m an Agency</h2>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold text-violet-700 uppercase">B2B</span>
            </div>
            <p className="mt-1 text-sm text-gray-500 leading-relaxed">
              List your agency, receive qualified leads, and grow your travel business with zero cold calls.
            </p>
          </div>

          <div className="space-y-1.5 mb-6 flex-1">
            {AGENCY_PERKS.map((perk) => (
              <div key={perk} className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 shrink-0 text-violet-500" />
                <p className="text-[11px] text-gray-600">{perk}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Free · GST required</span>
            <div className="flex items-center gap-1 rounded-xl bg-violet-600 group-hover:bg-violet-500 px-4 py-2 text-xs font-bold text-white transition-colors">
              Register agency <ArrowRight className="size-3.5" />
            </div>
          </div>
        </Link>
      </div>

      {/* Already have account */}
      <p className="mt-6 text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors">
          Sign in
        </Link>
      </p>

      {/* Trust row */}
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-[10px] text-gray-400">
        {["🔒 Escrow Protected", "✅ Verified Agencies", "💬 Real-Time Chat", "🎁 Referral Rewards"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}
