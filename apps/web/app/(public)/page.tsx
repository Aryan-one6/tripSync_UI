"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Shield, Users, ArrowRight, MapPin, Star, CheckCircle2,
  Compass, Lock, MessageSquare, Award, Search, TrendingUp,
  Handshake, ChevronRight,
} from "lucide-react";

// ─── Data ──────────────────────────────────────────────────────────────────────

const DESTINATIONS = [
  { name: "Manali", tag: "Adventure", image: "/destinations/manali" },
  { name: "Goa", tag: "Beach", image: "/destinations/goa.webp" },
  { name: "Leh-Ladakh", tag: "Mountains", image: "/destinations/leh ladhak.jpg" },
  { name: "Rishikesh", tag: "Spiritual", image: "/destinations/rishikesh.webp" },
  { name: "Rajasthan", tag: "Culture", image: "/destinations/Rajasthan.jpg" },
  { name: "Kerala", tag: "Nature", image: "/destinations/kerala.avif" },
  { name: "Andaman", tag: "Island", image: "/destinations/andaman.jpg" },
  { name: "Coorg", tag: "Hills", image: "/destinations/cooorg.jpg" },
];

const STATS = [
  { value: "12K+", label: "Travelers" },
  { value: "340+", label: "Agencies" },
  { value: "₹4.8Cr", label: "Escrow held" },
  { value: "98%", label: "Trip success" },
];

const STEPS = [
  { n: "01", icon: Compass, title: "Discover & Join", desc: "Browse plans and packages. Filter by destination, budget, or vibe.", color: "bg-emerald-500" },
  { n: "02", icon: Handshake, title: "Negotiate", desc: "Agencies bid on your plan. Counter-offer and lock the best deal.", color: "bg-violet-500" },
  { n: "03", icon: Shield, title: "Pay Securely", desc: "Funds held in escrow — only released after verified trip completion.", color: "bg-orange-500" },
  { n: "04", icon: MessageSquare, title: "Go & Enjoy", desc: "Group chat, polls, and shared docs — all in one place.", color: "bg-sky-500" },
];

const TRUST = [
  { icon: Shield, title: "Escrow Protection", desc: "Payment held until trip milestones complete. Zero risk to you.", badge: "Always on", badgeClass: "bg-emerald-50 text-emerald-700" },
  { icon: Lock, title: "Contact Masking", desc: "Phone numbers masked in chat. Your data stays safe.", badge: "AI-powered", badgeClass: "bg-violet-50 text-violet-700" },
  { icon: Award, title: "Verified Agencies", desc: "GST, PAN & tourism licence checked before any agency can bid.", badge: "Manual review", badgeClass: "bg-amber-50 text-amber-700" },
  { icon: TrendingUp, title: "Pro Payouts", desc: "Top-rated agencies get faster payouts and lower holds.", badge: "Earned status", badgeClass: "bg-sky-50 text-sky-700" },
];

const TESTIMONIALS = [
  { quote: "Found 7 amazing people for Spiti. The agency bid was below anything else we'd seen. Escrow gave me total confidence.", name: "Priya K.", role: "Solo → Group Lead", dest: "Spiti Valley", initials: "PK", grad: "from-emerald-500 to-teal-600" },
  { quote: "Knew my ₹18K was safe until the trip actually started. No more WhatsApp transfer anxiety.", name: "Rahul M.", role: "First-time group traveler", dest: "Rishikesh", initials: "RM", grad: "from-violet-500 to-purple-600" },
  { quote: "Qualified leads with confirmed groups and budgets. 10x better than any OTA listing we've tried.", name: "Sunshine Travels", role: "Verified Agency Partner", dest: "Goa · Kerala · HP", initials: "ST", grad: "from-orange-400 to-amber-500" },
];

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <section className="relative flex min-h-[88vh] flex-col overflow-hidden">
      {/* BG */}
      <div className="absolute inset-0">
        <Image src="/hero-mountains.png" alt="Group of travelers in the Himalayas" fill priority className="object-cover object-center" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/70" />
      </div>

      {/* Content — centred vertically */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-28 text-center text-white">
        {/* Pill badge */}
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-sm">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          India&apos;s #1 Group Travel Marketplace
        </span>

        {/* Headline — compact & punchy */}
        <h1 className="mx-auto max-w-2xl font-display text-3xl font-black leading-tight tracking-tight drop-shadow-lg sm:text-4xl md:text-[2.75rem]">
          Find Your Tribe.
          <br />
          <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
            Travel Together.
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:text-base">
          Connect with verified travel agencies. Build your group. Negotiate the best deal —
          every rupee protected by escrow.
        </p>

        {/* Search */}
        <div className="mt-6 w-full max-w-lg">
          <div className="flex overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-md">
            <Search className="my-auto ml-3.5 size-4 flex-shrink-0 text-white/50" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Where do you want to go?"
              className="flex-1 bg-transparent py-3 pl-2.5 pr-2 text-sm text-white placeholder:text-white/45 outline-none"
            />
            <Link
              href={`/discover${q ? `?q=${encodeURIComponent(q)}` : ""}`}
              className="m-1 flex-shrink-0 rounded-lg bg-emerald-500 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-400"
            >
              Search
            </Link>
          </div>

          {/* Quick picks */}
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {["Ladakh", "Rishikesh", "Goa", "Manali", "Coorg", "Andaman"].map((d) => (
              <Link
                key={d}
                href={`/discover?destination=${encodeURIComponent(d)}`}
                className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
              >
                {d}
              </Link>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <Link href="/discover" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400 hover:-translate-y-px">
            <Compass className="size-3.5" /> Explore Trips <ArrowRight className="size-3" />
          </Link>
          <Link href="/signup/traveler" className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 hover:-translate-y-px">
            <Users className="size-3.5" /> Join Free
          </Link>
        </div>

        {/* Trust tags */}
        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {["Escrow-protected", "Verified agencies", "No hidden fees", "48h refund"].map((t) => (
            <span key={t} className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-medium text-white/70">
              <CheckCircle2 className="size-2.5 text-emerald-400" /> {t}
            </span>
          ))}
        </div>
      </div>

      {/* Inline stats bar at bottom of hero */}
      <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl divide-x divide-white/10">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-1 flex-col items-center py-3">
              <p className="font-display text-lg font-black text-white">{s.value}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Destinations ─────────────────────────────────────────────────────────────

function Destinations() {
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">Explore India</p>
            <h2 className="font-display text-2xl font-black text-gray-950">Popular Destinations</h2>
          </div>
          <Link href="/discover" className="flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-500">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DESTINATIONS.map((d, i) => (
            <Link
              key={d.name}
              href={`/discover?destination=${encodeURIComponent(d.name)}`}
              className={`group relative overflow-hidden rounded-xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${i === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}
            >
              <div className={i === 0 ? "h-52 sm:h-full" : "h-32"}>
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${d.image})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-3">
                  <p className="font-display text-base font-bold text-white leading-tight">{d.name}</p>
                  <span className="mt-0.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/80">
                    {d.tag}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="bg-gray-50 py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">Simple process</p>
          <h2 className="font-display text-2xl font-black text-gray-950">
            From idea to adventure in <em className="not-italic text-emerald-600">4 steps</em>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.n} className="group relative rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="absolute right-4 top-3 font-display text-5xl font-black text-gray-950/[0.04] select-none">{s.n}</span>
                <div className={`mb-4 flex size-9 items-center justify-center rounded-lg ${s.color} shadow-sm`}>
                  <Icon className="size-4 text-white" />
                </div>
                <h3 className="mb-1.5 font-display text-sm font-bold text-gray-950">{s.title}</h3>
                <p className="text-xs leading-relaxed text-gray-500">{s.desc}</p>
                {i < 3 && (
                  <div className="hidden lg:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 size-5 items-center justify-center rounded-full bg-white shadow border border-gray-100">
                    <ChevronRight className="size-3 text-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Community split ───────────────────────────────────────────────────────────

function Community() {
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <div className="grid lg:grid-cols-2">
            {/* Image */}
            <div className="relative min-h-[280px] overflow-hidden">
              <Image src="/community-graphic.png" alt="Travelers around a campfire" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
            </div>

            {/* Text */}
            <div className="flex flex-col justify-center bg-gray-950 p-8 text-white">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">Your tribe awaits</p>
              <h2 className="font-display text-2xl font-black leading-snug">
                Travel is better with <span className="text-emerald-400">the right people.</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/60">
                TripSync lets you create public plans, find like-minded travelers,
                and form groups around shared itineraries. No more cold-DMs on Reddit.
              </p>
              <div className="mt-5 space-y-2.5">
                {[
                  "Build a group of 4–30 travelers around your custom plan",
                  "Real-time group chat, polls & shared documents",
                  "Gender-ratio controls for balanced group dynamics",
                  "Live agency bidding on your group plan",
                ].map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                    <CheckCircle2 className="mt-0.5 size-3.5 flex-shrink-0 text-emerald-400" />
                    {f}
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-2.5">
                <Link href="/discover" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400">
                  Find your tribe <ArrowRight className="size-3.5" />
                </Link>
                <Link href="/signup/traveler" className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                  Join free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Trust ────────────────────────────────────────────────────────────────────

function Trust() {
  return (
    <section className="bg-gray-50 py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">Safety first</p>
          <h2 className="font-display text-2xl font-black text-gray-950">
            Your money is safe. <em className="not-italic text-emerald-600">Always.</em>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-gray-900">
                  <Icon className="size-4 text-emerald-400" />
                </div>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider mb-2.5 ${f.badgeClass}`}>
                  {f.badge}
                </span>
                <h3 className="mb-1.5 font-display text-sm font-bold text-gray-950">{f.title}</h3>
                <p className="text-xs leading-relaxed text-gray-500">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="bg-white py-14">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 text-center">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-600">Real stories</p>
          <h2 className="font-display text-2xl font-black text-gray-950">
            Travelers <em className="not-italic text-emerald-600">love us.</em>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-xl border border-gray-100 bg-gray-50 p-5 shadow-sm">
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs leading-relaxed text-gray-600 italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-4 flex items-center gap-2.5">
                <div className={`flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.grad} text-[10px] font-bold text-white`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.name}</p>
                  <p className="text-[10px] text-gray-400">{t.role}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1">
                <MapPin className="size-3 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-medium">{t.dest}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Agency CTA strip ─────────────────────────────────────────────────────────

function AgencyCTA() {
  return (
    <section className="bg-gray-950 py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">For travel agencies</p>
            <h2 className="font-display text-xl font-black text-white">Grow your agency without cold calls.</h2>
            <p className="mt-1 text-sm text-white/50">Browse live group requests, bid in seconds. Free to list.</p>
          </div>
          <Link
            href="/signup/agency"
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-400 hover:-translate-y-px"
          >
            Register your agency <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 py-14 text-center text-white">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <Image src="/hero-mountains.png" alt="" fill className="object-cover object-top" sizes="100vw" />
      </div>
      <div className="relative mx-auto max-w-2xl px-4">
        <h2 className="font-display text-3xl font-black">Ready for your next adventure?</h2>
        <p className="mt-3 text-sm text-white/70">Thousands are already planning unforgettable group trips. Your tribe is waiting.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/discover" className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-lg transition hover:-translate-y-px">
            Browse Trips <ArrowRight className="size-3.5" />
          </Link>
          <Link href="/signup/traveler" className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20 hover:-translate-y-px">
            Sign Up Free
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div>
      <Hero />
      <Destinations />
      <HowItWorks />
      <Community />
      <Trust />
      <Testimonials />
      <AgencyCTA />
      <FinalCTA />
    </div>
  );
}
