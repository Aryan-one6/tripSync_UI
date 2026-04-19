"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef } from "react";
import {
  ArrowRight, CheckCircle2, Compass,
  Star, MapPin, Shield, Lock, Search,
  Handshake, Zap, Gift, TrendingUp, Calendar,
  ChevronLeft, ChevronRight,
} from "lucide-react";

// ─── Inline gradient styles (avoids Tailwind purge of dynamic classes) ─────────

const DEST_STYLES: Record<string, { from: string; to: string; emoji: string }> = {
  Kerala:     { from: "#065f46", to: "#047857", emoji: "🌴" },
  Manali:     { from: "#1e3a5f", to: "#1d4ed8", emoji: "🏔️" },
  Rajasthan:  { from: "#92400e", to: "#b45309", emoji: "🏰" },
  Ladakh:     { from: "#1e1b4b", to: "#4338ca", emoji: "🗻" },
  Goa:        { from: "#0e7490", to: "#0891b2", emoji: "🏖️" },
  Coorg:      { from: "#134e4a", to: "#0f766e", emoji: "☕" },
};

const DESTINATIONS = [
  { name: "Kerala",    sub: "Southern India",   trips: "124 trips" },
  { name: "Manali",    sub: "Himachal Pradesh",  trips: "230 trips" },
  { name: "Rajasthan", sub: "Desert & Forts",    trips: "98 trips"  },
  { name: "Ladakh",    sub: "High Altitude",     trips: "87 trips"  },
  { name: "Goa",       sub: "Beach & Nightlife", trips: "145 trips" },
  { name: "Coorg",     sub: "Coffee Country",    trips: "63 trips"  },
];

const TRIP_STYLES: Record<string, { from: string; to: string }> = {
  "Gulmarg Adventure":    { from: "#1e3a5f", to: "#1e40af" },
  "Ladakh Bike Odyssey":  { from: "#1e1b4b", to: "#4338ca" },
  "Kerala Backwaters":    { from: "#064e3b", to: "#065f46" },
};

const TRENDING_TRIPS = [
  { name: "Gulmarg Adventure",   dest: "Kashmir", price: "₹15,000", duration: "5D / 4N", seats: "3 seats left", rating: 4.8 },
  { name: "Ladakh Bike Odyssey", dest: "Ladakh",  price: "₹28,000", duration: "8D / 7N", seats: "2 seats left", rating: 4.9 },
  { name: "Kerala Backwaters",   dest: "Kerala",  price: "₹12,500", duration: "4D / 3N", seats: "5 seats left", rating: 4.7 },
];

const HOW_IT_WORKS = [
  { icon: Compass,   title: "Discover",      desc: "Browse curated group trips by destination, budget & style." },
  { icon: Handshake, title: "Negotiate",     desc: "Make direct offers to verified agencies and lock in the best deal." },
  { icon: Shield,    title: "Pay Securely",  desc: "Escrow holds funds — released only after trip success." },
  { icon: Zap,       title: "Go & Enjoy",   desc: "Real-time coordination with group chat, polls & docs." },
];

const TOP_AGENCIES = [
  { name: "Yeti Travel India",  trips: 128, rating: 4.9, tag: "Himalayan expert",  initials: "YT", style: { from: "#0891b2", to: "#0e7490" } },
  { name: "WanderWings Pvt.",   trips: 94,  rating: 4.8, tag: "Budget specialist", initials: "WW", style: { from: "#7c3aed", to: "#6d28d9" } },
  { name: "Deccan & Beyond",    trips: 67,  rating: 4.7, tag: "South India focus", initials: "DB", style: { from: "#ea580c", to: "#d97706" } },
];

const TRUST_ITEMS = [
  { icon: Shield,       label: "Escrow Payments",      desc: "Money released only after your trip completes successfully.", bg: "#10b981" },
  { icon: Lock,         label: "Contact Masking",      desc: "Phone numbers auto-masked in group chats to prevent fraud.",  bg: "#8b5cf6" },
  { icon: CheckCircle2, label: "GST Verified Agencies",desc: "All agencies pass GST, PAN, and licence checks before listing.", bg: "#f97316" },
  { icon: TrendingUp,   label: "Pro Mode Payouts",     desc: "High-performing agencies receive faster, reliable payouts.",  bg: "#0ea5e9" },
];

// ─── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  const [q, setQ] = useState("");

  return (
    <section className="relative flex flex-col" style={{ minHeight: "90svh" }}>
      <div className="absolute inset-0">
        <Image src="/hero-mountains.png" alt="Group travel in India" fill priority fetchPriority="high"
          className="object-cover object-[50%_30%]" sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/70" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 pb-10 pt-28 text-center">
        {/* Live badge */}
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/25 px-3 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-md">
          <span className="flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          India&apos;s #1 Group Travel Marketplace
        </div>

        {/* Headline — fluid scale */}
        <h1 style={{ lineHeight: 1.05 }}
          className="font-display font-black text-white drop-shadow-xl tracking-tight text-[clamp(2rem,7vw,5rem)]">
          Plan Trips Together.
          <br />
          <span className="text-emerald-400">Get the Best Deals.</span>
        </h1>

        <p className="mt-4 max-w-lg text-sm text-white/70 leading-relaxed sm:text-base">
          Connect with real travelers, negotiate directly with verified agencies, and travel safely — all on one platform.
        </p>

        {/* Search bar */}
        <div className="mt-6 w-full max-w-xl">
          <div className="flex items-center overflow-hidden rounded-2xl border border-white/20 bg-black/30 p-1.5 backdrop-blur-xl shadow-2xl">
            <Search className="ml-3 mr-1 size-4 shrink-0 text-white/50" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Where do you want to go?"
              className="flex-1 bg-transparent py-2.5 pr-2 text-sm text-white placeholder:text-white/40 outline-none"
            />
            <Link
              href={`/discover${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className="flex-shrink-0 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400 active:scale-95"
            >
              Search
            </Link>
          </div>

          {/* Filter tags — horizontal scroll on mobile */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {["Solo-Friendly", "Group Trip", "Budget", "Weekend", "Adventure", "Beach", "Trek"].map((tag) => (
              <Link key={tag} href={`/discover?style=${encodeURIComponent(tag)}`}
                className="flex-shrink-0 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {["PK", "RM", "SA", "VT"].map((init, i) => (
                <div key={init} style={{ zIndex: 4 - i, background: "linear-gradient(180deg,#34d399,#059669)" }}
                  className="flex size-6 items-center justify-center rounded-full border-2 border-white/20 text-[8px] font-bold text-white">
                  {init}
                </div>
              ))}
            </div>
            <p className="text-xs text-white/70"><span className="font-bold text-white">10,257+</span> travelers</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/70">
            <Star className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-bold text-white">4.8/5</span>
          </div>
          <p className="text-xs text-white/70"><span className="font-bold text-white">340+</span> verified agencies</p>
          <p className="text-xs text-white/70"><span className="font-bold text-white">122%</span> avg saving</p>
        </div>
      </div>

      {/* Wave */}
      <div className="relative z-10">
        <svg viewBox="0 0 1440 48" className="w-full" fill="white" preserveAspectRatio="none" style={{ display: "block", marginBottom: -1 }}>
          <path d="M0,48 C480,0 960,0 1440,48 L1440,48 L0,48 Z" />
        </svg>
      </div>
    </section>
  );
}

// ─── Destinations Slider ──────────────────────────────────────────────────────
function DestinationsSlider() {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") =>
    ref.current?.scrollBy({ left: dir === "right" ? 200 : -200, behavior: "smooth" });

  return (
    <section className="bg-white pb-8 pt-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-600">Explore India</p>
            <h2 className="mt-0.5 font-display text-xl font-black text-gray-950 sm:text-2xl">Popular Destinations</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => scroll("left")}
              className="hidden size-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600 sm:flex">
              <ChevronLeft className="size-4" />
            </button>
            <button onClick={() => scroll("right")}
              className="hidden size-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-emerald-300 hover:text-emerald-600 sm:flex">
              <ChevronRight className="size-4" />
            </button>
            <Link href="/discover" className="ml-1 text-xs font-semibold text-emerald-600 hover:text-emerald-500">View all →</Link>
          </div>
        </div>

        <div ref={ref} className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2"
          style={{ scrollbarWidth: "none" }}>
          {DESTINATIONS.map((d) => {
            const style = DEST_STYLES[d.name] ?? { from: "#064e3b", to: "#047857", emoji: "🌍" };
            return (
              <Link key={d.name} href={`/discover?destination=${encodeURIComponent(d.name)}`}
                className="group snap-start flex-shrink-0 w-40 sm:w-48 overflow-hidden rounded-2xl transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative flex h-44 flex-col justify-end p-3.5 sm:h-52"
                  style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}>
                  {/* Dot texture */}
                  <div className="pointer-events-none absolute inset-0 opacity-10"
                    style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
                  {/* Bottom gradient overlay */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {/* Emoji */}
                  <div className="relative text-3xl mb-1">{style.emoji}</div>
                  <div className="relative">
                    <p className="font-display text-[15px] font-bold text-white leading-tight">{d.name}</p>
                    <p className="text-[9px] text-white/60 mt-0.5">{d.sub}</p>
                    <p className="text-[9px] text-emerald-300 font-semibold mt-1">{d.trips}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  return (
    <section className="border-y border-gray-100 bg-white py-5">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { v: "10,257+", l: "Active Travelers" },
            { v: "340+",    l: "Verified Agencies" },
            { v: "₹4.8Cr", l: "Escrow Processed" },
            { v: "4.8 / 5", l: "Avg Trip Rating" },
          ].map((s) => (
            <div key={s.l} className="text-center">
              <p className="font-display text-xl font-black text-gray-950 sm:text-2xl">{s.v}</p>
              <p className="mt-0.5 text-[10px] text-gray-400">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section className="bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-6 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-600">Simple process</p>
          <h2 className="mt-0.5 font-display text-xl font-black text-gray-950 sm:text-2xl">How TravellersIn Works</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {HOW_IT_WORKS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="relative flex flex-col items-center rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
                <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="mb-3 flex size-10 items-center justify-center rounded-full border-2 border-emerald-100 bg-emerald-50">
                  <Icon className="size-4 text-emerald-600" />
                </div>
                <h3 className="font-display text-sm font-bold text-gray-950 mb-1">{s.title}</h3>
                <p className="text-[10px] text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Trending Trips ───────────────────────────────────────────────────────────
function TrendingTrips() {
  return (
    <section className="bg-white py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-600">Filling fast</p>
            <h2 className="mt-0.5 font-display text-xl font-black text-gray-950 sm:text-2xl">Trending Group Trips</h2>
          </div>
          <Link href="/discover" className="text-xs font-semibold text-emerald-600 hover:text-emerald-500">View all →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {TRENDING_TRIPS.map((trip) => {
            const ts = TRIP_STYLES[trip.name] ?? { from: "#064e3b", to: "#065f46" };
            return (
              <Link key={trip.name} href="/discover"
                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                {/* Visual header */}
                <div className="relative h-36 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${ts.from}, ${ts.to})` }}>
                  <div className="pointer-events-none absolute inset-0 opacity-10"
                    style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute top-2 left-2">
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">🔥 Hot</span>
                  </div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1">
                    <MapPin className="size-2.5 text-white/80" />
                    <span className="text-[11px] font-medium text-white/90">{trip.dest}</span>
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-0.5 backdrop-blur-sm">
                    <Star className="size-2.5 fill-amber-400 text-amber-400" />
                    <span className="text-[10px] font-bold text-white">{trip.rating}</span>
                  </div>
                </div>
                {/* Card body */}
                <div className="p-3.5">
                  <h3 className="font-display text-sm font-bold text-gray-950 mb-1.5 truncate">{trip.name}</h3>
                  <div className="flex items-center gap-3 text-[9px] text-gray-400 mb-2.5">
                    <span className="flex items-center gap-0.5"><Calendar className="size-2.5" />{trip.duration}</span>
                    <span className="ml-auto font-semibold text-red-500">{trip.seats}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-base font-black text-emerald-700">{trip.price}</p>
                      <p className="text-[9px] text-gray-400">per person</p>
                    </div>
                    <span className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
                      Join →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Agencies + Trust ─────────────────────────────────────────────────────────
function AgenciesAndTrust() {
  return (
    <section className="bg-gray-50 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Agencies */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-600">Verified partners</p>
                <h3 className="mt-0.5 font-display text-lg font-black text-gray-950">Top Agencies</h3>
              </div>
              <Link href="/agencies" className="text-xs font-semibold text-emerald-600">View all →</Link>
            </div>
            <div className="space-y-2.5">
              {TOP_AGENCIES.map((a) => (
                <div key={a.name} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${a.style.from}, ${a.style.to})` }}>
                    {a.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-950">{a.name}</p>
                    <p className="text-[10px] text-gray-400">{a.tag} · {a.trips} trips</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Star className="size-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-gray-700">{a.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-600">Safety first</p>
              <h3 className="mt-0.5 font-display text-lg font-black text-gray-950">Secure & Transparent</h3>
            </div>
            <div className="space-y-3">
              {TRUST_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: item.bg }}>
                      <Icon className="size-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-950">{item.label}</p>
                      <p className="text-[10px] leading-relaxed text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Referral + Final CTA (combined for compactness) ─────────────────────────
function BottomSections() {
  return (
    <>
      {/* Referral */}
      <section className="bg-gray-950 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                <Gift className="size-2.5" /> Refer & Earn
              </div>
              <h3 className="font-display text-lg font-black text-white">Earn While You Explore</h3>
              <p className="mt-0.5 max-w-sm text-xs text-white/50">
                Refer a friend — you both earn 250 reward points (₹250) off your next trip.
              </p>
            </div>
            <Link href="/signup"
              className="inline-flex flex-shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400 sm:self-auto">
              Start Earning <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-16 text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
        <div className="relative mx-auto max-w-xl px-4">
          <h2 className="font-display text-2xl font-black text-white sm:text-3xl">Your Next Horizon Awaits.</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/60">
            Join 10,000+ travelers planning epic group adventures across India.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-emerald-800 shadow-xl transition hover:-translate-y-px hover:shadow-2xl">
              Start Planning <ArrowRight className="size-4" />
            </Link>
            <Link href="/signup/agency"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20">
              Register Agency
            </Link>
          </div>
          {/* Trust tags */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["🔒 Escrow Protected", "✅ Verified Agencies", "💬 Real-Time Chat", "🎁 Referral Rewards"].map((t) => (
              <span key={t} className="rounded-full border border-white/15 bg-white/08 px-3 py-1 text-[10px] text-white/60">{t}</span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div>
      <Hero />
      <DestinationsSlider />
      <StatsBar />
      <HowItWorks />
      <TrendingTrips />
      <AgenciesAndTrust />
      <BottomSections />
    </div>
  );
}
