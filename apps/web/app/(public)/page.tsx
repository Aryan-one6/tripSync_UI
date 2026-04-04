import Link from "next/link";
import {
  Shield,
  Users,
  Handshake,
  ArrowRight,
  MapPin,
  Star,
  CheckCircle2,
  Compass,
  Lock,
  TrendingUp,
  MessageSquare,
  CreditCard,
  Zap,
  Award,
  ChevronRight,
  IndianRupee,
} from "lucide-react";
import { getDiscoverItems, getTrendingItems } from "@/lib/api/public";

export const dynamic = "force-dynamic";

// ─── Destinations strip ──────────────────────────────────────────────────────

const DESTINATIONS = [
  { name: "Manali", tag: "Adventure", emoji: "⛷️", color: "from-blue-500 to-cyan-400" },
  { name: "Goa", tag: "Beach", emoji: "🏖️", color: "from-orange-400 to-yellow-300" },
  { name: "Leh-Ladakh", tag: "Mountains", emoji: "🏔️", color: "from-slate-600 to-blue-500" },
  { name: "Rishikesh", tag: "Spiritual", emoji: "🚣", color: "from-green-500 to-teal-400" },
  { name: "Rajasthan", tag: "Culture", emoji: "🏰", color: "from-amber-500 to-orange-400" },
  { name: "Kerala", tag: "Nature", emoji: "🌴", color: "from-emerald-500 to-green-400" },
  { name: "Andaman", tag: "Island", emoji: "🐚", color: "from-cyan-500 to-blue-400" },
  { name: "Coorg", tag: "Hills", emoji: "☕", color: "from-brown-500 to-green-500" },
];

function DestinationStrip() {
  return (
    <section className="py-10 overflow-hidden">
      <p className="mb-5 text-center text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-sea-600)]">
        Popular destinations
      </p>
      {/* Scroll row */}
      <div className="relative">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--color-surface)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--color-surface)] to-transparent" />

        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 px-4">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.name}
              href={`/discover?destination=${encodeURIComponent(d.name)}`}
              className="shrink-0 group"
            >
              <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${d.color} p-0.5 shadow-[var(--shadow-md)] transition-all hover:shadow-[var(--shadow-lg)] hover:-translate-y-1`}>
                <div className="rounded-[calc(1rem-2px)] bg-white/10 backdrop-blur-sm px-5 py-4 text-center text-white">
                  <div className="text-3xl mb-1">{d.emoji}</div>
                  <p className="font-display text-base font-bold leading-tight">{d.name}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-white/70 mt-0.5">{d.tag}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Stats strip ─────────────────────────────────────────────────────────────

const STATS = [
  { value: "12,000+", label: "Travelers Matched", icon: Users },
  { value: "340+", label: "Verified Agencies", icon: Award },
  { value: "₹4.8Cr", label: "Escrow Protected", icon: Shield },
  { value: "98%", label: "Trip Completion Rate", icon: Star },
];

function StatsStrip() {
  return (
    <section className="py-12">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl border border-[var(--color-border)] bg-white p-6 text-center shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
            >
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)] shadow-[var(--shadow-sm)]">
                <Icon className="size-5 text-[var(--color-sea-600)]" />
              </div>
              <p className="font-display text-3xl font-black text-[var(--color-ink-950)] sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--color-ink-500)] uppercase tracking-[0.15em]">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Hero section ──────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-8 pt-16 sm:pb-12 sm:pt-20">
      {/* Background gradient blobs */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--color-sea-200), transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute top-20 -right-20 w-[500px] h-[500px] rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--color-sunset-200), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full opacity-15"
        style={{
          background:
            "radial-gradient(ellipse at center, var(--color-lavender-200), transparent 70%)",
        }}
      />

      <div className="relative text-center">
        {/* Live badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] px-4 py-2 text-sm font-semibold text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]">
          <span className="relative flex size-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-sea-500)] opacity-75" />
            <span className="relative inline-flex rounded-full size-2 bg-[var(--color-sea-500)]" />
          </span>
          India&apos;s #1 group travel marketplace
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-5xl font-display text-5xl font-black leading-[1.02] tracking-tight text-[var(--color-ink-950)] sm:text-6xl md:text-7xl lg:text-8xl">
          Find your{" "}
          <span className="relative inline-block">
            <em className="not-italic text-[var(--color-sea-600)]">tribe.</em>
          </span>
          <br />
          Travel{" "}
          <em className="not-italic bg-gradient-to-r from-[var(--color-sunset-500)] to-[var(--color-sunset-700)] bg-clip-text text-transparent">
            together.
          </em>
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-[var(--color-ink-600)] sm:text-xl">
          TravellersIn connects group travellers with verified agencies. Browse plans,
          join groups, negotiate with agencies — all in one place with{" "}
          <strong className="font-semibold text-[var(--color-ink-800)]">escrow-protected payments</strong>.
        </p>

        {/* CTA row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/discover"
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-sea-600)] px-8 py-4 text-base font-bold text-white shadow-[var(--shadow-lg)] transition-all hover:bg-[var(--color-sea-500)] hover:shadow-[0_12px_32px_rgba(14,167,130,0.4)] hover:-translate-y-1 active:scale-[0.98]"
          >
            <Compass className="size-5" />
            Explore trips
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/signup/traveler"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-white px-8 py-4 text-base font-bold text-[var(--color-ink-800)] shadow-[var(--shadow-sm)] transition-all hover:border-[var(--color-sea-300)] hover:shadow-[var(--shadow-md)] hover:-translate-y-1"
          >
            <Users className="size-5" />
            Join free
          </Link>
        </div>

        {/* Trust pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5 text-sm text-[var(--color-ink-600)]">
          {[
            "Escrow-protected payments",
            "Verified agencies",
            "No hidden charges",
            "48h refund protection",
            "Real-time group chat",
          ].map((pill) => (
            <span
              key={pill}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1.5 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
            >
              <CheckCircle2 className="size-3.5 text-[var(--color-sea-600)]" />
              {pill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      step: "01",
      icon: Compass,
      title: "Discover & Join",
      desc: "Browse community plans and agency packages. Filter by destination, budget, dates, or vibe. Join the ones that excite you.",
      color: "sea",
    },
    {
      step: "02",
      icon: Handshake,
      title: "Negotiate with Agencies",
      desc: "Agencies bid on your plan. Counter-offer, discuss inclusions, and accept the best deal — all in-platform with 3-round negotiation.",
      color: "lavender",
    },
    {
      step: "03",
      icon: CreditCard,
      title: "Pay Securely",
      desc: "₹299 convenience fee + trip cost held in escrow. Funds only release to the agency when trip milestones complete.",
      color: "sunset",
    },
    {
      step: "04",
      icon: MessageSquare,
      title: "Coordinate & Go",
      desc: "Group chat, polls, document sharing, contact card — everything you need to organise the perfect group trip.",
      color: "sea",
    },
  ];

  const colorMap: Record<string, { card: string; icon: string; num: string }> = {
    sea: {
      card: "border-[var(--color-sea-100)] bg-gradient-to-b from-white to-[var(--color-sea-50)]",
      icon: "from-[var(--color-sea-50)] to-[var(--color-sea-100)] text-[var(--color-sea-700)]",
      num: "text-[var(--color-sea-100)]",
    },
    lavender: {
      card: "border-[var(--color-lavender-100)] bg-gradient-to-b from-white to-[var(--color-lavender-50)]",
      icon: "from-[var(--color-lavender-50)] to-[var(--color-lavender-100)] text-[var(--color-lavender-500)]",
      num: "text-[var(--color-lavender-100)]",
    },
    sunset: {
      card: "border-[var(--color-sunset-100)] bg-gradient-to-b from-white to-[var(--color-sunset-50)]",
      icon: "from-[var(--color-sunset-50)] to-[var(--color-sunset-100)] text-[var(--color-sunset-700)]",
      num: "text-[var(--color-sunset-100)]",
    },
  };

  return (
    <section className="py-16 sm:py-20">
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-sea-600)]">
          How it works
        </p>
        <h2 className="font-display text-4xl font-black text-[var(--color-ink-950)] sm:text-5xl">
          From idea to adventure
          <br />
          <em className="not-italic text-[var(--color-sea-600)]">in 4 steps</em>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[var(--color-ink-600)]">
          The most transparent group travel workflow in India.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const c = colorMap[s.color];
          return (
            <div
              key={s.step}
              className={`group relative rounded-2xl border p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-lg)] hover:-translate-y-2 ${c.card}`}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Step number — background */}
              <span className={`absolute right-5 top-4 font-display text-6xl font-black leading-none select-none ${c.num}`}>
                {s.step}
              </span>

              <div className="relative mb-5">
                <div
                  className={`flex size-12 items-center justify-center rounded-xl bg-gradient-to-b shadow-[var(--shadow-sm)] ${c.icon}`}
                >
                  <Icon className="size-5" />
                </div>
              </div>
              <h3 className="mb-2 font-display text-lg font-bold text-[var(--color-ink-950)]">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-ink-600)]">{s.desc}</p>

              {/* Arrow connector (except last) */}
              {i < 3 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="size-6 text-[var(--color-ink-300)]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Trust & Safety section ────────────────────────────────────────────────────

function TrustSection() {
  const features = [
    {
      icon: Shield,
      title: "Escrow Protection",
      desc: "Your payment is held until trip milestones complete — 50% released at trip start, 50% after completing the journey.",
      badge: "Always active",
      badgeColor: "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]",
    },
    {
      icon: Lock,
      title: "Contact Masking",
      desc: "Phone numbers and external payment IDs are automatically masked in chat, keeping your data safe and deals on-platform.",
      badge: "AI-powered",
      badgeColor: "bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)]",
    },
    {
      icon: Star,
      title: "Verified Agencies",
      desc: "Every agency is checked for GST, PAN, and tourism licences before they can bid on your plan.",
      badge: "Manual review",
      badgeColor: "bg-[var(--color-sunset-50)] text-[var(--color-sunset-600)]",
    },
    {
      icon: TrendingUp,
      title: "Pro Mode Payouts",
      desc: "High-performing agencies earn Pro mode — 30% advance at booking, faster cash flow, better trips for you.",
      badge: "Earned status",
      badgeColor: "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]",
    },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-ink-950)] via-[var(--color-ink-900)] to-[#0d6350] p-8 shadow-[var(--shadow-xl)] sm:p-12 lg:p-16">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-[var(--color-sea-500)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 size-60 rounded-full bg-[var(--color-sea-400)]/10 blur-3xl" />

        <div className="relative">
          <div className="mb-12 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-sea-400)]">
              Built for trust
            </p>
            <h2 className="font-display text-4xl font-black text-white sm:text-5xl">
              Your money is safe.{" "}
              <em className="not-italic text-[var(--color-sea-400)]">Always.</em>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/60">
              We built every feature with one question — how do we protect travellers from fraud?
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:bg-white/8 hover:border-white/20"
                >
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-white/10">
                    <Icon className="size-5 text-[var(--color-sea-400)]" />
                  </div>
                  <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider mb-3 ${f.badgeColor}`}>
                    {f.badge}
                  </span>
                  <h3 className="mb-2 font-display text-lg font-bold text-white">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/55">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing clarity ──────────────────────────────────────────────────────────

function PricingSection() {
  const items = [
    {
      label: "Convenience fee",
      amount: "₹299 + GST",
      amountSub: "per booking",
      desc: "One-time platform fee. Covers payment processing, escrow management, and 24/7 dispute support. Always shown before you pay.",
      highlight: false,
      icon: CreditCard,
    },
    {
      label: "Agency commission",
      amount: "8% of trip",
      amountSub: "deducted from payout",
      desc: "Charged to the agency, not you. Agencies price this into their packages. You pay exactly what you agreed.",
      highlight: true,
      icon: IndianRupee,
    },
    {
      label: "Traveller pays",
      amount: "Trip price only",
      amountSub: "+ above fee",
      desc: "No hidden markups on the trip cost. No surprise GST stacks. Full breakdown shown at checkout before any payment.",
      highlight: false,
      icon: Zap,
    },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-sea-600)]">
          Transparent pricing
        </p>
        <h2 className="font-display text-4xl font-black text-[var(--color-ink-950)] sm:text-5xl">
          No surprises — ever.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[var(--color-ink-600)]">
          India&apos;s most honest travel platform. See exactly what you&apos;re paying before you commit.
        </p>
      </div>

      <div className="mx-auto max-w-5xl grid gap-5 md:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`relative rounded-2xl border p-7 transition-all hover:-translate-y-1 ${
                item.highlight
                  ? "border-[var(--color-sea-300)] bg-gradient-to-b from-[var(--color-sea-50)] to-white shadow-[0_4px_20px_rgba(14,167,130,0.15)]"
                  : "border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
              }`}
            >
              {item.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-[var(--color-sea-600)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Best value
                  </span>
                </div>
              )}
              <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-[var(--color-surface-2)]">
                <Icon className={`size-5 ${item.highlight ? "text-[var(--color-sea-600)]" : "text-[var(--color-ink-600)]"}`} />
              </div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-ink-400)]">
                {item.label}
              </p>
              <p className="font-display text-3xl font-black text-[var(--color-ink-950)]">
                {item.amount}
              </p>
              <p className="text-xs text-[var(--color-ink-400)] mb-4">{item.amountSub}</p>
              <p className="text-sm leading-relaxed text-[var(--color-ink-600)]">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── For agencies CTA ─────────────────────────────────────────────────────────

function AgencyCTA() {
  const features = [
    { label: "Live trip requests" },
    { label: "3-round negotiation" },
    { label: "Agency wallet & ledger" },
    { label: "Pro payout mode" },
    { label: "Analytics dashboard" },
    { label: "8% vs 15–25% OTA commissions" },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-ink-950)] via-[var(--color-ink-900)] to-[var(--color-ink-800)] p-8 text-white shadow-[var(--shadow-xl)] sm:p-12">
        <div className="pointer-events-none absolute -right-16 -top-16 size-80 rounded-full bg-white/3 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 size-48 rounded-full bg-[var(--color-sea-500)]/10 blur-2xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-sea-400)]">
              For travel agencies
            </p>
            <h2 className="font-display text-4xl font-black leading-tight sm:text-5xl">
              Grow your agency
              <br />
              <em className="not-italic text-[var(--color-sea-400)]">without cold calls.</em>
            </h2>
            <p className="mt-4 max-w-xl text-white/60 leading-relaxed">
              Browse live group trip requests, submit bids in seconds, and negotiate fair prices.
              Your agency wallet tracks every rupee in real time.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {features.map((feat) => (
                <span
                  key={feat.label}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-2 text-sm font-medium text-white/80 border border-white/8"
                >
                  <CheckCircle2 className="size-3.5 shrink-0 text-[var(--color-sea-400)]" />
                  {feat.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <Link
              href="/signup/agency"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-sea-500)] px-7 py-4 text-base font-bold text-white shadow-[var(--shadow-md)] transition-all hover:bg-[var(--color-sea-400)] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(14,167,130,0.4)]"
            >
              Register your agency
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-xs text-white/40">Free to list · Commission only on booking</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Trending trips preview ────────────────────────────────────────────────────

async function TrendingPreview() {
  const items = await getTrendingItems().catch(() => []);
  if (items.length === 0) return null;

  const palettes = [
    "from-[#0d9670] via-[#14b88a] to-[#5edbb5]",
    "from-[#e04f1a] via-[#f06830] to-[#ffa574]",
    "from-[#2a5f8f] via-[#3a7cb5] to-[#7db8e0]",
    "from-[#5a7c2f] via-[#7da33f] to-[#b5d47a]",
    "from-[#7c3aed] via-[#9678ff] to-[#b09dff]",
    "from-[#be185d] via-[#ec4899] to-[#f9a8d4]",
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-sea-600)]">
            Live marketplace
          </p>
          <h2 className="font-display text-4xl font-black text-[var(--color-ink-950)] sm:text-5xl">
            Trending right now
          </h2>
        </div>
        <Link
          href="/discover"
          className="group flex items-center gap-1 text-sm font-bold text-[var(--color-sea-600)] transition hover:text-[var(--color-sea-500)]"
        >
          View all
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 6).map((item, i) => {
          const href = item.originType === "plan" ? `/plans/${item.slug}` : `/packages/${item.slug}`;
          const fillPct = Math.min(100, Math.round((item.joinedCount / item.groupSizeMax) * 100));
          const palette = palettes[i % palettes.length];
          return (
            <Link
              key={`${item.originType}-${item.id}`}
              href={href}
              className="group block"
            >
              <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-xl)] hover:-translate-y-2">
                {/* Color header strip */}
                <div className={`h-2 w-full bg-gradient-to-r ${palette}`} />

                <div className="p-5">
                  {/* Type pill */}
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                        item.originType === "plan"
                          ? "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                          : "bg-[var(--color-sunset-50)] text-[var(--color-sunset-700)]"
                      }`}
                    >
                      {item.originType === "plan" ? "Community plan" : "Agency package"}
                    </span>
                    {fillPct >= 80 && (
                      <span className="text-[10px] font-bold text-[var(--color-sunset-600)]">
                        🔥 {fillPct}% filled
                      </span>
                    )}
                  </div>

                  <h3 className="mb-1 truncate font-display text-lg font-bold text-[var(--color-ink-950)] group-hover:text-[var(--color-sea-700)] transition-colors">
                    {item.title}
                  </h3>

                  <div className="mb-4 flex items-center gap-1.5 text-sm text-[var(--color-ink-600)]">
                    <MapPin className="size-3.5" />
                    {item.destination}
                    {item.destinationState && `, ${item.destinationState}`}
                  </div>

                  {/* Fill bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-semibold text-[var(--color-ink-400)]">
                      <span>Group fill</span>
                      <span className="text-[var(--color-sea-700)]">
                        {item.joinedCount}/{item.groupSizeMax} members
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${palette} transition-all`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Testimonial / Social Proof ───────────────────────────────────────────────

function SocialProof() {
  const testimonials = [
    {
      quote: "Found 7 amazing people for our Spiti Valley trip using TravellersIn. The agency bid was ₹2,000 lower than what we'd been quoted elsewhere.",
      name: "Priya K.",
      title: "Solo Traveler → Group Lead",
      initials: "PK",
      rating: 5,
    },
    {
      quote: "The escrow protection is what sold me. Paid ₹18,000 and knew it was held safely until the trip started. No more WhatsApp risk.",
      name: "Rahul M.",
      title: "First-time group traveler",
      initials: "RM",
      rating: 5,
    },
    {
      quote: "As an agency, the qualified leads are worth the commission. Travelers come with dates and budgets ready. It's not like MakeMyTrip.",
      name: "Sunshine Travels",
      title: "Verified Agency Partner",
      initials: "ST",
      rating: 5,
    },
  ];

  return (
    <section className="py-16 sm:py-20">
      <div className="mb-12 text-center">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--color-sea-600)]">
          Real stories
        </p>
        <h2 className="font-display text-4xl font-black text-[var(--color-ink-950)] sm:text-5xl">
          Travelers love us
        </h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-1"
          >
            {/* Stars */}
            <div className="mb-4 flex gap-1">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="size-4 fill-[var(--color-sunset-400)] text-[var(--color-sunset-400)]" />
              ))}
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-ink-700)] italic">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-xs font-bold text-white">
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-ink-900)]">{t.name}</p>
                <p className="text-[11px] text-[var(--color-ink-500)]">{t.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-16 sm:py-20">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--color-sea-600)] via-[var(--color-sea-500)] to-[var(--color-sea-700)] p-10 text-center text-white shadow-[var(--shadow-xl)] sm:p-16">
        <div className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 size-60 rounded-full bg-[var(--color-sea-300)]/20 blur-2xl" />

        <div className="relative">
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-2xl bg-white/15 shadow-[var(--shadow-lg)]">
            <Compass className="size-10 text-white" />
          </div>
          <h2 className="font-display text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
            Ready for your
            <br />
            next adventure?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/75">
            Thousands of travellers are already planning unforgettable group trips on TravellersIn.
            Your tribe is waiting.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/discover"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-lg font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-lg)] transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.2)] hover:-translate-y-1"
            >
              Browse trips
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/agencies"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:-translate-y-1"
            >
              View agencies
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  return (
    <div className="page-shell">
      <HeroSection />
      <StatsStrip />
      <DestinationStrip />
      <HowItWorks />
      <TrustSection />
      <TrendingPreview />
      <PricingSection />
      <SocialProof />
      <AgencyCTA />
      <FinalCTA />
    </div>
  );
}
