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
  Zap,
  Award,
  ChevronRight,
} from "lucide-react";
import { getTrendingItems } from "@/lib/api/public";

export const dynamic = "force-dynamic";

// ─── Destinations strip ──────────────────────────────────────────────────────

const DESTINATIONS = [
  {
    name: "Manali",
    tag: "Adventure",
    image: "/destinations/manali",
    tint: "from-sky-500/40 via-sky-700/25 to-indigo-900/70",
  },
  {
    name: "Goa",
    tag: "Beach",
    image: "/destinations/goa.webp",
    tint: "from-orange-300/45 via-amber-400/25 to-blue-900/60",
  },
  {
    name: "Leh-Ladakh",
    tag: "Mountains",
    image: "/destinations/leh%20ladhak.jpg",
    tint: "from-slate-400/35 via-blue-700/20 to-slate-950/70",
  },
  {
    name: "Rishikesh",
    tag: "Spiritual",
    image: "/destinations/rishikesh.webp",
    tint: "from-emerald-300/35 via-teal-600/20 to-slate-950/70",
  },
  {
    name: "Rajasthan",
    tag: "Culture",
    image: "/destinations/Rajasthan.jpg",
    tint: "from-amber-300/45 via-orange-500/25 to-zinc-950/65",
  },
  {
    name: "Kerala",
    tag: "Nature",
    image: "/destinations/kerala.avif",
    tint: "from-emerald-300/35 via-green-600/20 to-zinc-950/70",
  },
  {
    name: "Andaman",
    tag: "Island",
    image: "/destinations/andaman.jpg",
    tint: "from-cyan-300/35 via-sky-600/20 to-slate-950/70",
  },
  {
    name: "Coorg",
    tag: "Hills",
    image: "/destinations/cooorg.jpg",
    tint: "from-lime-300/35 via-green-600/20 to-zinc-950/70",
  },
];

function DestinationStrip() {
  return (
    <section className="py-7 overflow-hidden">
      <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-sea-600)]">
        Popular destinations
      </p>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[var(--color-surface)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[var(--color-surface)] to-transparent" />
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-1 px-3">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.name}
              href={`/discover?destination=${encodeURIComponent(d.name)}`}
              className="shrink-0 group"
            >
              <div className="relative overflow-hidden rounded-xl shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${d.image})` }}
                />
                <div className={`absolute inset-0 bg-gradient-to-br ${d.tint}`} />
                <div className="relative min-w-[100px] px-4 py-4 text-center text-white">
                  <p className="font-display text-sm font-bold leading-tight">{d.name}</p>
                  <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-white/80">{d.tag}</p>
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
  { value: "98%", label: "Trip Completion", icon: Star },
];

function StatsStrip() {
  return (
    <section className="py-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-[var(--color-border)] bg-white px-4 py-4 text-center shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
            >
              <div className="mx-auto mb-2 flex size-9 items-center justify-center rounded-lg bg-gradient-to-b from-[var(--color-sea-50)] to-[var(--color-sea-100)]">
                <Icon className="size-4 text-[var(--color-sea-600)]" />
              </div>
              <p className="font-display text-2xl font-black text-[var(--color-ink-950)] sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-[var(--color-ink-500)] uppercase tracking-[0.12em]">
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
    <section className="relative overflow-hidden pb-6 pt-10 sm:pb-8 sm:pt-14">
      {/* Background gradient blobs */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-25"
        style={{ background: "radial-gradient(ellipse at center, var(--color-sea-200), transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute top-10 -right-20 w-[380px] h-[380px] rounded-full opacity-15"
        style={{ background: "radial-gradient(ellipse at center, var(--color-sunset-200), transparent 70%)" }}
      />

      <div className="relative text-center">
        {/* Live badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-sea-200)] bg-[var(--color-sea-50)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-sea-700)] shadow-[var(--shadow-sm)]">
          <span className="relative flex size-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-sea-500)] opacity-75" />
            <span className="relative inline-flex rounded-full size-1.5 bg-[var(--color-sea-500)]" />
          </span>
          India&apos;s #1 group travel marketplace
        </div>

        {/* Headline — scaled down for compact, professional look */}
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-black leading-[1.05] tracking-tight text-[var(--color-ink-950)] sm:text-5xl md:text-6xl">
          Find your{" "}
          <em className="not-italic text-[var(--color-sea-600)]">tribe.</em>
          <br />
          Travel{" "}
          <em className="not-italic bg-gradient-to-r from-[var(--color-sunset-500)] to-[var(--color-sunset-700)] bg-clip-text text-transparent">
            together.
          </em>
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[var(--color-ink-600)] sm:text-lg">
          TravellersIn connects group travellers with verified agencies. Browse
          plans, join groups, negotiate with agencies — all in one place with{" "}
          <strong className="font-semibold text-[var(--color-ink-800)]">escrow-protected payments</strong>.
        </p>

        {/* CTA row */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/discover"
            className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-sea-600)] px-6 py-3 text-sm font-bold text-white shadow-[var(--shadow-md)] transition-all hover:bg-[var(--color-sea-500)] hover:shadow-[0_8px_24px_rgba(14,167,130,0.35)] hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Compass className="size-4" />
            Explore trips
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/signup/traveler"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-white px-6 py-3 text-sm font-bold text-[var(--color-ink-800)] shadow-[var(--shadow-sm)] transition-all hover:border-[var(--color-sea-300)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
          >
            <Users className="size-4" />
            Join free
          </Link>
        </div>

        {/* Trust pills */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--color-ink-600)]">
          {[
            "Escrow-protected payments",
            "Verified agencies",
            "No hidden charges",
            "48h refund protection",
            "Real-time group chat",
          ].map((pill) => (
            <span
              key={pill}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 shadow-[var(--shadow-sm)] border border-[var(--color-border)]"
            >
              <CheckCircle2 className="size-3 text-[var(--color-sea-600)]" />
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
      desc: "Browse community plans and agency packages. Filter by destination, dates, or vibe. Join the ones that excite you.",
      color: "sea",
    },
    {
      step: "02",
      icon: Handshake,
      title: "Negotiate",
      desc: "Agencies bid on your plan. Counter-offer, discuss inclusions, and accept the best deal — all in-platform.",
      color: "lavender",
    },
    {
      step: "03",
      icon: Shield,
      title: "Pay Securely",
      desc: "Trip cost held in escrow. Funds only release to the agency when trip milestones complete — zero risk for you.",
      color: "sunset",
    },
    {
      step: "04",
      icon: MessageSquare,
      title: "Coordinate & Go",
      desc: "Group chat, polls, document sharing — everything to organise the perfect group trip in one place.",
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
    <section className="py-10 sm:py-14">
      <div className="mb-8 text-center">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-sea-600)]">
          How it works
        </p>
        <h2 className="font-display text-3xl font-black text-[var(--color-ink-950)] sm:text-4xl">
          From idea to adventure{" "}
          <em className="not-italic text-[var(--color-sea-600)]">in 4 steps</em>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--color-ink-600)]">
          The most transparent group travel workflow in India.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const c = colorMap[s.color];
          return (
            <div
              key={s.step}
              className={`group relative rounded-xl border p-5 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-1 ${c.card}`}
            >
              <span className={`absolute right-4 top-3 font-display text-5xl font-black leading-none select-none ${c.num}`}>
                {s.step}
              </span>
              <div className="relative mb-4">
                <div className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-b shadow-[var(--shadow-sm)] ${c.icon}`}>
                  <Icon className="size-4.5" />
                </div>
              </div>
              <h3 className="mb-1.5 font-display text-base font-bold text-[var(--color-ink-950)]">
                {s.title}
              </h3>
              <p className="text-xs leading-relaxed text-[var(--color-ink-600)]">{s.desc}</p>
              {i < 3 && (
                <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10">
                  <ChevronRight className="size-5 text-[var(--color-ink-300)]" />
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
      desc: "Your payment is held until trip milestones complete — funds only released after verified trip completion.",
      badge: "Always active",
      badgeColor: "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]",
    },
    {
      icon: Lock,
      title: "Contact Masking",
      desc: "Phone numbers and payment IDs are auto-masked in chat, keeping your data safe and deals on-platform.",
      badge: "AI-powered",
      badgeColor: "bg-[var(--color-lavender-50)] text-[var(--color-lavender-500)]",
    },
    {
      icon: Star,
      title: "Verified Agencies",
      desc: "Every agency is verified for GST, PAN, and tourism licences before they can bid on your plan.",
      badge: "Manual review",
      badgeColor: "bg-[var(--color-sunset-50)] text-[var(--color-sunset-600)]",
    },
    {
      icon: TrendingUp,
      title: "Pro Mode Payouts",
      desc: "High-performing agencies earn Pro status — faster payouts, better cash flow, superior trip quality.",
      badge: "Earned status",
      badgeColor: "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]",
    },
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-ink-950)] via-[var(--color-ink-900)] to-[#0d6350] p-7 shadow-[var(--shadow-xl)] sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-[var(--color-sea-500)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-1/4 size-48 rounded-full bg-[var(--color-sea-400)]/8 blur-3xl" />

        <div className="relative">
          <div className="mb-8 text-center">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-sea-400)]">
              Built for trust
            </p>
            <h2 className="font-display text-3xl font-black text-white sm:text-4xl">
              Your money is safe.{" "}
              <em className="not-italic text-[var(--color-sea-400)]">Always.</em>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/55">
              Every feature built to protect travellers from fraud and hidden surprises.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:bg-white/8 hover:border-white/15"
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="size-4.5 text-[var(--color-sea-400)]" />
                  </div>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider mb-2.5 ${f.badgeColor}`}>
                    {f.badge}
                  </span>
                  <h3 className="mb-1.5 font-display text-base font-bold text-white">
                    {f.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-white/55">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Value props — replaces Pricing ──────────────────────────────────────────

function ValueProps() {
  const props = [
    {
      icon: Zap,
      title: "Full Transparency",
      desc: "See a complete cost breakdown before you commit — trip price, platform fee, and all applicable taxes. Zero surprises at checkout.",
      highlight: false,
    },
    {
      icon: Shield,
      title: "Lowest Platform Fees",
      desc: "We charge industry-low fees — far below traditional OTAs. Full fee details are listed on our Fees & Taxes page.",
      highlight: true,
    },
    {
      icon: Users,
      title: "No Hidden Charges",
      desc: "What you agree in negotiation is what you pay. No markup on trip cost, no surprise GST stacks after you've committed.",
      highlight: false,
    },
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="mb-8 text-center">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-sea-600)]">
          Honest pricing
        </p>
        <h2 className="font-display text-3xl font-black text-[var(--color-ink-950)] sm:text-4xl">
          No surprises — ever.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[var(--color-ink-600)]">
          India&apos;s most honest travel platform.{" "}
          <Link href="/fees" className="font-semibold text-[var(--color-sea-600)] hover:underline">
            View our full fee schedule →
          </Link>
        </p>
      </div>

      <div className="mx-auto max-w-4xl grid gap-4 md:grid-cols-3">
        {props.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`relative rounded-xl border p-6 transition-all hover:-translate-y-0.5 ${
                item.highlight
                  ? "border-[var(--color-sea-200)] bg-gradient-to-b from-[var(--color-sea-50)] to-white shadow-[0_4px_16px_rgba(14,167,130,0.12)]"
                  : "border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"
              }`}
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-[var(--color-surface-2)]">
                <Icon className={`size-4.5 ${item.highlight ? "text-[var(--color-sea-600)]" : "text-[var(--color-ink-600)]"}`} />
              </div>
              <h3 className="mb-2 font-display text-base font-bold text-[var(--color-ink-950)]">
                {item.title}
              </h3>
              <p className="text-xs leading-relaxed text-[var(--color-ink-600)]">{item.desc}</p>
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
    { label: "Low, transparent commission" },
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-gradient-to-r from-[var(--color-ink-950)] via-[var(--color-ink-900)] to-[var(--color-ink-800)] p-7 text-white shadow-[var(--shadow-xl)] sm:p-10">
        <div className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-white/3 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 size-40 rounded-full bg-[var(--color-sea-500)]/8 blur-2xl" />

        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-sea-400)]">
              For travel agencies
            </p>
            <h2 className="font-display text-3xl font-black leading-tight sm:text-4xl">
              Grow your agency
              <br />
              <em className="not-italic text-[var(--color-sea-400)]">without cold calls.</em>
            </h2>
            <p className="mt-3 max-w-lg text-sm text-white/60 leading-relaxed">
              Browse live group trip requests, submit bids in seconds, and negotiate
              fair prices. Your agency wallet tracks every rupee in real time.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {features.map((feat) => (
                <span
                  key={feat.label}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-3 py-2 text-xs font-medium text-white/80 border border-white/8"
                >
                  <CheckCircle2 className="size-3 shrink-0 text-[var(--color-sea-400)]" />
                  {feat.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2.5 lg:items-end">
            <Link
              href="/signup/agency"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-sea-500)] px-6 py-3 text-sm font-bold text-white shadow-[var(--shadow-md)] transition-all hover:bg-[var(--color-sea-400)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(14,167,130,0.4)] whitespace-nowrap"
            >
              Register your agency
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-[10px] text-white/40 lg:text-right">
              Free to list · Commission only on booking
            </p>
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
    <section className="py-10 sm:py-14">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-sea-600)]">
            Live marketplace
          </p>
          <h2 className="font-display text-3xl font-black text-[var(--color-ink-950)] sm:text-4xl">
            Trending right now
          </h2>
        </div>
        <Link
          href="/discover"
          className="group flex items-center gap-1 text-sm font-bold text-[var(--color-sea-600)] transition hover:text-[var(--color-sea-500)]"
        >
          View all
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
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
              <div className="relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-lg)] hover:-translate-y-1">
                <div className={`h-1.5 w-full bg-gradient-to-r ${palette}`} />
                <div className="p-4">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        item.originType === "plan"
                          ? "bg-[var(--color-sea-50)] text-[var(--color-sea-700)]"
                          : "bg-[var(--color-sunset-50)] text-[var(--color-sunset-700)]"
                      }`}
                    >
                      {item.originType === "plan" ? "Community plan" : "Agency package"}
                    </span>
                    {fillPct >= 80 && (
                      <span className="text-[9px] font-bold text-[var(--color-sunset-600)]">
                        🔥 {fillPct}% filled
                      </span>
                    )}
                  </div>

                  <h3 className="mb-1 truncate font-display text-base font-bold text-[var(--color-ink-950)] group-hover:text-[var(--color-sea-700)] transition-colors">
                    {item.title}
                  </h3>

                  <div className="mb-3.5 flex items-center gap-1.5 text-xs text-[var(--color-ink-600)]">
                    <MapPin className="size-3" />
                    {item.destination}
                    {item.destinationState && `, ${item.destinationState}`}
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-semibold text-[var(--color-ink-400)]">
                      <span>Group fill</span>
                      <span className="text-[var(--color-sea-700)]">
                        {item.joinedCount}/{item.groupSizeMax} members
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
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
      quote: "Found 7 amazing people for our Spiti Valley trip using TravellersIn. The agency bid was well below what we'd been quoted elsewhere.",
      name: "Priya K.",
      title: "Solo Traveler → Group Lead",
      initials: "PK",
      rating: 5,
    },
    {
      quote: "The escrow protection is what sold me. I knew my payment was held safely until the trip started. No more WhatsApp transfer risk.",
      name: "Rahul M.",
      title: "First-time group traveler",
      initials: "RM",
      rating: 5,
    },
    {
      quote: "As an agency, the qualified leads are worth it. Travelers come with dates and budgets ready. Far better than any OTA we've tried.",
      name: "Sunshine Travels",
      title: "Verified Agency Partner",
      initials: "ST",
      rating: 5,
    },
  ];

  return (
    <section className="py-10 sm:py-14">
      <div className="mb-8 text-center">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--color-sea-600)]">
          Real stories
        </p>
        <h2 className="font-display text-3xl font-black text-[var(--color-ink-950)] sm:text-4xl">
          Travelers love us
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="rounded-xl border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-sm)] transition-all hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
          >
            <div className="mb-3 flex gap-0.5">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-[var(--color-sunset-400)] text-[var(--color-sunset-400)]" />
              ))}
            </div>
            <p className="text-xs leading-relaxed text-[var(--color-ink-700)] italic">
              &ldquo;{t.quote}&rdquo;
            </p>
            <div className="mt-4 flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--color-sea-500)] to-[var(--color-sea-700)] text-[10px] font-bold text-white">
                {t.initials}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--color-ink-900)]">{t.name}</p>
                <p className="text-[10px] text-[var(--color-ink-500)]">{t.title}</p>
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
    <section className="py-10 sm:py-14">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-sea-600)] via-[var(--color-sea-500)] to-[var(--color-sea-700)] p-8 text-center text-white shadow-[var(--shadow-xl)] sm:p-12">
        <div className="pointer-events-none absolute -left-16 -top-16 size-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 size-48 rounded-full bg-[var(--color-sea-300)]/15 blur-2xl" />

        <div className="relative">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-xl bg-white/15 shadow-[var(--shadow-md)]">
            <Compass className="size-8 text-white" />
          </div>
          <h2 className="font-display text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
            Ready for your
            <br />
            next adventure?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-white/70">
            Thousands of travellers are already planning unforgettable group trips on TravellersIn.
            Your tribe is waiting.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/discover"
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[var(--color-sea-700)] shadow-[var(--shadow-md)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] hover:-translate-y-0.5"
            >
              Browse trips
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/agencies"
              className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:-translate-y-0.5"
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
      <ValueProps />
      <SocialProof />
      <AgencyCTA />
      <FinalCTA />
    </div>
  );
}
