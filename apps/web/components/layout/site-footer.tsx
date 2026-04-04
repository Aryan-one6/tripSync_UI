import Link from "next/link";
import Image from "next/image";
import { Shield, Star, Zap, Users, Mail, MapPin } from "lucide-react";

const footerNav = [
  {
    heading: "Platform",
    links: [
      { href: "/discover", label: "Discover Trips" },
      { href: "/agencies", label: "Browse Agencies" },
      { href: "/signup/traveler", label: "Join as Traveler" },
      { href: "/signup/agency", label: "Register Agency" },
      { href: "/fees", label: "Fees & Taxes" },
    ],
  },
  {
    heading: "Travelers",
    links: [
      { href: "/dashboard/plans/new", label: "Create a Plan" },
      { href: "/dashboard/trips", label: "My Trips" },
      { href: "/dashboard/messages", label: "Group Chat" },
      { href: "/dashboard/refer-and-earn", label: "Refer & Earn" },
    ],
  },
  {
    heading: "Agencies",
    links: [
      { href: "/agency/dashboard", label: "Agency Dashboard" },
      { href: "/agency/packages/new", label: "Create Package" },
      { href: "/agency/bids", label: "Bid Manager" },
      { href: "/agency/analytics", label: "Analytics" },
    ],
  },
];

const trustBadges = [
  { icon: Shield, label: "Escrow Protected" },
  { icon: Star, label: "Verified Agencies" },
  { icon: Zap, label: "Real-Time Chat" },
  { icon: Users, label: "Group Travel" },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-[var(--color-border)]">
      {/* Main footer body */}
      <div className="bg-[var(--color-ink-950)]">
        <div className="page-shell py-14">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">

            {/* Brand column */}
            <div className="space-y-6">
              <Image
                src="/brand/travellersin.png"
                alt="TravellersIn"
                width={312}
                height={92}
                className="h-10 w-auto brightness-0 invert"
              />
              <p className="max-w-xs text-sm leading-relaxed text-white/55">
                India's group travel marketplace — connecting adventurers with
                verified agencies. Escrow-protected payments. Real negotiations.
                Real trips.
              </p>
              {/* Trust badges */}
              <div className="flex flex-wrap gap-2">
                {trustBadges.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/60"
                  >
                    <Icon className="size-3 text-[var(--color-sea-400)]" />
                    {label}
                  </span>
                ))}
              </div>
              {/* Contact */}
              <div className="space-y-2 text-sm text-white/40">
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 shrink-0" />
                  <span>hello@travellersin.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-3.5 shrink-0" />
                  <span>Bangalore, India</span>
                </div>
              </div>
            </div>

            {/* Nav columns */}
            {footerNav.map((col) => (
              <div key={col.heading}>
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-white/30">
                  {col.heading}
                </p>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/55 transition-colors duration-150 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/8">
          <div className="page-shell flex flex-wrap items-center justify-between gap-4 py-5 text-[11px] text-white/30">
            <p>© {new Date().getFullYear()} TravellersIn. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="#" className="transition hover:text-white/60">Privacy Policy</Link>
              <Link href="#" className="transition hover:text-white/60">Terms of Service</Link>
              <Link href="#" className="transition hover:text-white/60">Refund Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

