import { TravelerSignupForm } from "@/components/auth/traveler-signup-form";
import { Mountain, Users, Shield, MapPin } from "lucide-react";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const VIBES = [
  { emoji: "⛷️", label: "Manali" },
  { emoji: "🏖️", label: "Goa" },
  { emoji: "🏔️", label: "Ladakh" },
  { emoji: "🚣", label: "Rishikesh" },
  { emoji: "🌴", label: "Kerala" },
  { emoji: "🏰", label: "Rajasthan" },
];

export default async function TravelerSignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/dashboard/feed";

  return (
    <div className="min-h-[90vh] grid lg:grid-cols-[1fr_1fr]">

      {/* ── Left: visual side ── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-gradient-to-br from-[var(--color-sea-700)] via-[var(--color-sea-600)] to-[var(--color-sea-500)]">
        {/* Blobs */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 size-60 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex flex-1 flex-col justify-between p-12">
          {/* Top */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white/80 backdrop-blur-sm">
              <Mountain className="size-3.5" />
              Join the tribe
            </span>
          </div>

          {/* Middle */}
          <div className="space-y-6">
            <h1 className="font-display text-5xl font-black leading-[1.02] text-white xl:text-6xl">
              Your next group
              <br />
              <em className="not-italic text-white/70">adventure</em>
              <br />
              starts now.
            </h1>
            <p className="max-w-sm text-white/60 leading-relaxed">
              Create your traveler profile once. Then browse plans, join groups,
              negotiate deals, and pay safely — all from one account.
            </p>

            {/* Destinations grid */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {VIBES.map((v) => (
                <div
                  key={v.label}
                  className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-center backdrop-blur-sm"
                >
                  <div className="text-xl mb-1">{v.emoji}</div>
                  <p className="text-xs font-semibold text-white/80">{v.label}</p>
                </div>
              ))}
            </div>

            {/* 3 trust points */}
            <div className="space-y-3 pt-2">
              {[
                { icon: Shield, text: "Escrow-protected payments on every booking" },
                { icon: Users, text: "Join verified group trips instantly" },
                { icon: MapPin, text: "Browse 500+ destinations across India" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="size-4 text-white/80" />
                  </div>
                  <p className="text-sm text-white/65">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-white/15 pt-6">
            <p className="text-sm font-semibold text-white">12,000+ travelers</p>
            <p className="text-xs text-white/45 mt-1">have already joined TravellersIn</p>
          </div>
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="flex items-start justify-center p-6 sm:p-10 lg:p-12 bg-[var(--color-surface)] overflow-y-auto">
        <div className="w-full max-w-md pt-4">
          <TravelerSignupForm nextPath={nextPath} />
        </div>
      </div>
    </div>
  );
}
