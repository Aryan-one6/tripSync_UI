"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  FilePlus2,
  Handshake,
  LayoutDashboard,
  MessageSquareText,
  Route,
  Settings,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";

const userNav = [
  { href: "/dashboard/plans", label: "My Plans", icon: Route },
  { href: "/dashboard/plans/new", label: "New Plan", icon: FilePlus2 },
  { href: "/dashboard/trips", label: "My Trips", icon: Ticket },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquareText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const agencyNav = [
  { href: "/agency/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/agency/packages/new", label: "Create Package", icon: FilePlus2 },
  { href: "/agency/bids", label: "Bid Manager", icon: Handshake },
  { href: "/agency/referrals", label: "Referrals", icon: BriefcaseBusiness },
  { href: "/agency/settings", label: "Verification", icon: Settings },
];

export function AppSidebar({
  variant,
  onNavigate,
}: {
  variant: "user" | "agency";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = variant === "agency" ? agencyNav : userNav;
  const title = variant === "agency" ? "Agency Console" : "Traveler Space";
  const Icon = variant === "agency" ? Building2 : MessageSquareText;

  return (
    <aside className="rounded-[var(--radius-xl)] border border-white/60 bg-[var(--color-surface-raised)] p-4 shadow-[var(--shadow-clay)] sm:p-5">
      {/* Sidebar header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-b from-[var(--color-sand-100)] to-[var(--color-sand-200)] text-[var(--color-ink-700)] shadow-[var(--shadow-clay-sm)]">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="font-display text-base text-[var(--color-ink-950)]">{title}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-500)]">
            Navigation
          </p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="space-y-1.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[var(--color-sea-50)] text-[var(--color-sea-700)] shadow-[var(--shadow-clay-sm)] border border-[var(--color-sea-100)]"
                  : "text-[var(--color-ink-600)] hover:bg-[var(--color-surface-2)] hover:shadow-[var(--shadow-clay-sm)] border border-transparent",
              )}
            >
              <item.icon className={cn("size-4", active ? "text-[var(--color-sea-500)]" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
