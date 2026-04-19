import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import Link from "next/link";
import { Shield, Star, Users } from "lucide-react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TRUST = [
  { icon: Shield, title: "Escrow-protected payments", desc: "Your money is held safely until the trip completes." },
  { icon: Star, title: "Verified travel agencies", desc: "Every agency passes GST, PAN, and licence checks." },
  { icon: Users, title: "Active traveler community", desc: "12,000+ travelers planning adventures right now." },
];

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" && params.next.startsWith("/") ? params.next : "/discover?audience=traveler";
  const defaultIdentifier =
    typeof params.identifier === "string"
      ? params.identifier
      : typeof params.email === "string"
        ? params.email
        : typeof params.username === "string"
          ? params.username
          : "";
  const successMessage =
    params.signup === "traveler" ? "Account created! Sign in to start exploring." :
    params.signup === "agency" ? "Agency account created. Sign in to your dashboard." :
    undefined;
  const referralCode =
    typeof params.ref === "string" && /^[A-Za-z0-9]{6,8}$/.test(params.ref.trim())
      ? params.ref.trim().toUpperCase()
      : "";

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-[1fr_480px]">
      {/* ── Left panel — visual/brand side ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden">
        {/* Hero image */}
        <Image src="/hero-mountains.png" alt="Group travel" fill className="object-cover object-center" priority sizes="60vw" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-emerald-900/60" />

        {/* Content overlay */}
        <div className="relative z-10 flex flex-1 flex-col justify-between p-10">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-black text-white">TravellersIn</span>
            <span className="rounded-full bg-emerald-500/30 border border-emerald-400/30 px-2 py-0.5 text-[9px] font-bold text-emerald-300 uppercase tracking-wider">Beta</span>
          </Link>

          {/* Middle — headline */}
          <div className="space-y-5">
            <h2 className="font-display text-4xl font-black text-white leading-tight drop-shadow">
              Plan Trips Together.
              <br />
              <span className="text-emerald-400">Get the Best Deals.</span>
            </h2>
            <p className="text-sm text-white/60 max-w-sm leading-relaxed">
              India&apos;s most transparent group travel marketplace. Verified agencies, escrow payments, real-time coordination.
            </p>

            {/* Trust features */}
            <div className="space-y-3 pt-2">
              {TRUST.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10">
                    <Icon className="size-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom social proof */}
          <div className="border-t border-white/10 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {["PK", "RM", "SA", "VT"].map((init, i) => (
                  <div key={init} className="flex size-8 items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-b from-emerald-400 to-emerald-700 text-[9px] font-bold text-white" style={{ zIndex: 4 - i }}>
                    {init}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">12,000+ travelers</p>
                <p className="text-xs text-white/40">already on TravellersIn</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-white">4.8</span>
                <span className="text-xs text-white/40">avg rating</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex flex-col overflow-y-auto bg-white">
        {/* Mobile brand */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 lg:hidden">
          <Link href="/" className="font-display text-lg font-black text-gray-950">TravellersIn</Link>
        </div>

        <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-sm">
            <LoginForm
              nextPath={nextPath}
              defaultIdentifier={defaultIdentifier}
              successMessage={successMessage}
              referralCode={referralCode}
            />
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6 text-center text-[10px] text-gray-400">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-emerald-600 hover:underline">Terms</Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
}
