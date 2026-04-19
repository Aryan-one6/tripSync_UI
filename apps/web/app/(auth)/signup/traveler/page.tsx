import { TravelerSignupForm } from "@/components/auth/traveler-signup-form";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PERKS = [
  "Browse 500+ destinations across India",
  "Join verified group trips instantly",
  "Negotiate directly with agencies",
  "Escrow-protected payments on every booking",
  "Real-time group chat & trip coordination",
  "Earn 250 points for every referral",
];

const VIBES = [
  { emoji: "⛷️", label: "Manali" },
  { emoji: "🏖️", label: "Goa" },
  { emoji: "🏔️", label: "Ladakh" },
  { emoji: "🚣", label: "Rishikesh" },
  { emoji: "🌴", label: "Kerala" },
  { emoji: "🏰", label: "Rajasthan" },
];

export default async function TravelerSignupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/discover?audience=traveler";
  const referralCode =
    typeof params.ref === "string" && /^[A-Za-z0-9]{6,8}$/.test(params.ref.trim())
      ? params.ref.trim().toUpperCase()
      : "";

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1fr_520px]">
      {/* ── Left: visual side ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-gray-950">
        <Image src="/community-graphic.png" alt="Travelers" fill className="object-cover object-center opacity-50" sizes="55vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/70 via-gray-950/50 to-emerald-950/80" />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-10">
          <Link href="/" className="font-display text-xl font-black text-white">TravellersIn</Link>

          <div className="space-y-5">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
              🎒 Join the tribe
            </div>
            <h2 className="font-display text-4xl font-black text-white leading-tight">
              Your next group
              <br />
              <span className="text-emerald-400">adventure</span>
              <br />
              starts now.
            </h2>
            <p className="text-sm text-white/60 max-w-sm leading-relaxed">
              Create your traveler profile once. Browse plans, join groups, negotiate deals, and pay safely — all from one account.
            </p>

            {/* Perks */}
            <div className="space-y-2.5 pt-1">
              {PERKS.map((perk) => (
                <div key={perk} className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                  <p className="text-sm text-white/70">{perk}</p>
                </div>
              ))}
            </div>

            {/* Destination grid */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {VIBES.map((v) => (
                <div key={v.label} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2.5 text-center backdrop-blur-sm">
                  <div className="text-xl mb-1">{v.emoji}</div>
                  <p className="text-xs font-semibold text-white/80">{v.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-5">
            <p className="text-sm font-bold text-white">12,000+ travelers</p>
            <p className="text-xs text-white/40 mt-0.5">have already joined TravellersIn</p>
          </div>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="flex flex-col overflow-y-auto bg-white">
        {/* Mobile brand */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 lg:hidden">
          <Link href="/" className="font-display text-lg font-black text-gray-950">TravellersIn</Link>
          <Link
            href={`/login${referralCode ? `?ref=${encodeURIComponent(referralCode)}` : ""}`}
            className="text-sm font-semibold text-emerald-600"
          >
            Sign In
          </Link>
        </div>

        <div className="flex flex-1 items-start justify-center p-4 sm:p-7 sm:pt-8">
          <div className="w-full max-w-md">
            <TravelerSignupForm nextPath={nextPath} initialReferralCode={referralCode} />
          </div>
        </div>

        <div className="px-6 pb-6 text-center text-[10px] text-gray-400">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-emerald-600 hover:underline">Terms</Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
}
