import Link from "next/link";
import Image from "next/image";
import { Shield, Star, Zap, Users, Mail, MapPin, Phone } from "lucide-react";

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
];

const trustBadges = [
  { icon: Shield, label: "Escrow Protected" },
  { icon: Star, label: "Verified Agencies" },
  { icon: Zap, label: "Real-Time Chat" },
  { icon: Users, label: "Group Travel" },
];

export function SiteFooter() {
  const infoItems = [
    { icon: Mail, label: "Support@travellersin.com" },
    { icon: MapPin, label: "Noida, India" },
    { icon: Phone, label: "Toll free : +91 1234567890" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-[var(--color-border)]">
      {/* Main footer body */}
      <div className="bg-[var(--color-ink-950)]">
        <div className="page-shell py-14">
          <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">

            {/* Brand column */}
            <div className="space-y-6">
             <Link href="/" className="flex shrink-0 items-center">
            <Image
              src= "/brand/travellersin-light.png" 
              alt="TravellersIn"
              width={312}
              height={92}
              priority
              className="h-8 w-auto sm:h-9"
            />
          </Link>
              <p className="max-w-xs text-sm leading-relaxed text-white/90">
                India&apos;s group travel marketplace — connecting adventurers with
                verified agencies. Escrow-protected payments. Real negotiations.
                Real trips.
              </p>
              {/* Trust badges */}
              <div className="flex flex-wrap gap-2">
                {trustBadges.map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90"
                  >
                    <Icon className="size-3 text-[var(--color-sea-400)]" />
                    {label}
                  </span>
                ))}
              </div>
              {/* Mobile info stack (keep simple on mobile) */}
              <div className="space-y-2 text-sm text-white/90 md:hidden">
                {infoItems.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className="size-3.5 shrink-0 text-[var(--color-sea-300)]" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>

            </div>

            {/* Nav columns */}
            <div className="grid grid-cols-2 gap-8 lg:col-span-2">
              {footerNav.map((col) => (
                <div key={col.heading}>
                  <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] footer-link-title">
                    {col.heading}
                  </p>
                  <ul className="space-y-3">
                    {col.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="footer-link text-[15px] font-medium text-white sm:text-sm"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Desktop contact column */}
            <div className="hidden lg:block">
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.2em] footer-link-title">
                Contact Us
              </p>
              <ul className="space-y-3">
                {infoItems.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 text-sm text-white"
                  >
                    <Icon className="size-4 shrink-0 text-[var(--color-sea-300)]" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/8">
          <div className="page-shell flex flex-col gap-3 py-4 pb-mobile-nav text-xs text-white md:flex-row md:items-center md:justify-between md:gap-4 md:py-5 md:pb-5 md:text-[11px]">
            <p>© {new Date().getFullYear()} TravellersIn. All rights reserved.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="#" className="transition hover:text-white">Privacy Policy</Link>
              <Link href="#" className="transition hover:text-white">Terms of Service</Link>
              <Link href="#" className="transition hover:text-white">Refund Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
