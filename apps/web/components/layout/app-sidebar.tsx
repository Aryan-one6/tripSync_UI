"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  Compass,
  FilePlus2,
  Handshake,
  LayoutDashboard,
  MessageSquareText,
  UserRound,
  Route,
  Settings,
  Ticket,
} from "lucide-react";
import { cn } from "@/lib/utils";

const userNav = [
  { href: "/dashboard/feed", label: "Feed", icon: Compass },
  { href: "/dashboard/plans", label: "My Plans", icon: Route },
  { href: "/dashboard/plans/new", label: "Create Plan", icon: FilePlus2 },
  { href: "/dashboard/trips", label: "My Trips", icon: Ticket },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquareText },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
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
    <aside className="rounded-xl border border-(--color-border) bg-(--color-surface-raised) p-4 shadow-(--shadow-md) sm:p-5">
      {/* Sidebar header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md border border-(--color-border) bg-(--color-surface-2) text-(--color-ink-700)">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="font-display text-base text-(--color-ink-950)">{title}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-(--color-ink-500)">
            Navigation
          </p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-(--color-sea-50) text-(--color-sea-700) border border-(--color-sea-100)"
                  : "text-(--color-ink-600) hover:bg-(--color-surface-2) border border-transparent",
              )}
            >
              <item.icon className={cn("size-4", active ? "text-(--color-sea-500)" : "")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
