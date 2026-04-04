import { LoginForm } from "@/components/auth/login-form";
import { Shield, Star, Zap } from "lucide-react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TRUST_FEATURES = [
  {
    icon: Shield,
    title: "Escrow-protected payments",
    desc: "Your money is held safely until the trip completes.",
  },
  {
    icon: Star,
    title: "Verified travel agencies",
    desc: "Every agency passes GST, PAN, and licence checks.",
  },
  {
    icon: Zap,
    title: "Real-time group coordination",
    desc: "Live chat, polls, and document sharing built in.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/dashboard/feed";
  const defaultEmail = typeof params.email === "string" ? params.email : "";
  const successMessage =
    params.signup === "traveler"
      ? "Traveler account created. Log in with your new credentials."
      : params.signup === "agency"
        ? "Agency account created. Log in with your new credentials."
        : undefined;

  return (
    <div className="min-h-[90vh] grid lg:grid-cols-[1fr_1fr]">

      {/* ── Left panel — visual/brand side ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-gradient-to-br from-[var(--color-ink-950)] via-[var(--color-sea-900,#0a4536)] to-[#0d6350]">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-[var(--color-sea-500)]/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 right-0 size-60 rounded-full bg-[var(--color-sea-400)]/10 blur-3xl" />

        <div className="relative flex flex-1 flex-col justify-between p-12">
          {/* Top: Brand */}
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold text-white/70">
              <span className="relative flex size-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-sea-400)] opacity-75" />
                <span className="relative inline-flex rounded-full size-1.5 bg-[var(--color-sea-400)]" />
              </span>
              TravellersIn Platform
            </div>
          </div>

          {/* Middle: Headline */}
          <div className="space-y-6">
            <h1 className="font-display text-5xl font-black leading-[1.02] text-white xl:text-6xl">
              Your next group
              <br />
              <em className="not-italic text-[var(--color-sea-400)]">adventure</em>
              <br />
              starts here.
            </h1>
            <p className="max-w-sm text-white/55 leading-relaxed">
              India&apos;s most transparent group travel marketplace. Escrow-protected
              payments. Verified agencies. Real-time coordination.
            </p>

            {/* Trust features */}
            <div className="space-y-4 pt-2">
              {TRUST_FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/10">
                    <Icon className="size-4 text-[var(--color-sea-400)]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: social proof */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex items-center gap-4">
              {/* Avatar stack */}
              <div className="flex -space-x-2">
                {["PK", "RM", "SA", "VT", "NK"].map((init, i) => (
                  <div
                    key={init}
                    className="flex size-8 items-center justify-center rounded-full border-2 border-[var(--color-ink-900)] bg-gradient-to-b from-[var(--color-sea-400)] to-[var(--color-sea-700)] text-[10px] font-bold text-white"
                    style={{ zIndex: 5 - i }}
                  >
                    {init}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">12,000+ travelers</p>
                <p className="text-xs text-white/45">already on platform</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel — the form ── */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12 bg-[var(--color-surface)]">
        <div className="w-full max-w-md">
          <LoginForm
            nextPath={nextPath}
            defaultEmail={defaultEmail}
            successMessage={successMessage}
          />
        </div>
      </div>
    </div>
  );
}
